#!/usr/bin/env python3
"""A command line tool for extracting text and images from PDF and
output it to plain text, html, xml or tags.
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from string import Template
from typing import List, Optional

from pdf2zh import __version__, log
from pdf2zh.converter_docx import convert_to_pdf, is_convertible

logger = logging.getLogger(__name__)


def create_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__, add_help=True)
    parser.add_argument(
        "files",
        type=str,
        default=None,
        nargs="*",
        help="One or more paths to PDF/Word files.",
    )
    parser.add_argument(
        "--version",
        "-v",
        action="version",
        version=f"pdf2zh v{__version__}",
    )
    parser.add_argument(
        "--debug",
        "-d",
        default=False,
        action="store_true",
        help="Use debug logging level.",
    )
    parse_params = parser.add_argument_group(
        "Parser",
        description="Used during PDF parsing",
    )
    parse_params.add_argument(
        "--pages",
        "-p",
        type=str,
        help="The list of page numbers to parse.",
    )
    parse_params.add_argument(
        "--vfont",
        "-f",
        type=str,
        default="",
        help="The regex to math font name of formula.",
    )
    parse_params.add_argument(
        "--vchar",
        "-c",
        type=str,
        default="",
        help="The regex to math character of formula.",
    )
    parse_params.add_argument(
        "--lang-in",
        "-li",
        type=str,
        default="en",
        help="The code of source language.",
    )
    parse_params.add_argument(
        "--lang-out",
        "-lo",
        type=str,
        default="zh",
        help="The code of target language.",
    )
    parse_params.add_argument(
        "--service",
        "-s",
        type=str,
        default="google",
        help="The service to use for translation.",
    )
    parse_params.add_argument(
        "--output",
        "-o",
        type=str,
        default="",
        help="Output directory for files.",
    )
    parse_params.add_argument(
        "--thread",
        "-t",
        type=int,
        default=4,
        help="The number of threads to execute translation.",
    )
    parse_params.add_argument(
        "--interactive",
        "-i",
        action="store_true",
        help="Interact with GUI.",
    )
    parse_params.add_argument(
        "--share",
        action="store_true",
        help="Enable Gradio Share",
    )
    parse_params.add_argument(
        "--authorized",
        type=str,
        nargs="+",
        help="user name and password.",
    )
    parse_params.add_argument(
        "--prompt",
        type=str,
        help="user custom prompt.",
    )

    parse_params.add_argument(
        "--compatible",
        "-cp",
        action="store_true",
        help="Convert the PDF file into PDF/A format to improve compatibility.",
    )

    parse_params.add_argument(
        "--onnx",
        type=str,
        help="custom onnx model path.",
    )

    parse_params.add_argument(
        "--backend",
        type=str,
        choices=["auto", "cpu", "cuda", "dml"],
        default="auto",
        help="ONNX Runtime execution provider: auto, cpu, cuda, dml.",
    )

    parse_params.add_argument(
        "--serverport",
        type=int,
        help="custom WebUI port.",
    )

    parse_params.add_argument(
        "--dir",
        action="store_true",
        help="translate directory.",
    )

    parse_params.add_argument(
        "--config",
        type=str,
        help="config file.",
    )

    parse_params.add_argument(
        "--mode",
        type=str,
        choices=["fast", "precise"],
        default="fast",
        help="Translation mode: fast (v1) or precise (v2, requires pdf2zh_next).",
    )

    parse_params.add_argument(
        "--babeldoc",
        default=False,
        action="store_true",
        help="Use experimental backend babeldoc.",
    )

    parse_params.add_argument(
        "--skip-subset-fonts",
        action="store_true",
        help="Skip font subsetting. "
        "This option can improve compatibility "
        "but will increase the size of the output file.",
    )

    parse_params.add_argument(
        "--ignore-cache",
        action="store_true",
        help="Ignore cache and force retranslation.",
    )

    parse_params.add_argument(
        "--mcp", action="store_true", help="Launch pdf2zh MCP server in STDIO mode"
    )

    parse_params.add_argument(
        "--sse", action="store_true", help="Launch pdf2zh MCP server in SSE mode"
    )

    parse_params.add_argument(
        "--setup",
        action="store_true",
        help="Launch interactive service configuration wizard. "
        "Guides you through selecting a translation service, "
        "entering API credentials, testing connectivity, "
        "and persisting the configuration to disk.",
    )

    return parser


def parse_args(args: Optional[List[str]]) -> argparse.Namespace:
    parsed_args = create_parser().parse_args(args=args)

    if parsed_args.pages:
        pages = []
        for p in parsed_args.pages.split(","):
            if "-" in p:
                start, end = p.split("-")
                pages.extend(range(int(start) - 1, int(end)))
            else:
                pages.append(int(p) - 1)
        parsed_args.raw_pages = parsed_args.pages
        parsed_args.pages = pages

    return parsed_args


def setup_wizard() -> int:
    """
    Interactive configuration wizard for first-time setup.

    Guides the user through:
    1. Selecting a translation service (free or paid)
    2. Entering API credentials (if required)
    3. Testing connectivity
    4. Persisting the configuration to ~/.config/PDFMathTranslate/config.json

    Returns 0 on success, 1 on user abort or failure.
    """
    from pdf2zh.config import ConfigManager
    from pdf2zh.translator import TranslatorRegistry

    print()
    print("=" * 56)
    print("  PDFMathTranslate -- Service Configuration Wizard")
    print("=" * 56)
    print()

    # Step 1: Load and display available services
    # Trigger lazy registration
    import pdf2zh.translator  # noqa: F401

    all_svcs = TranslatorRegistry.list_all()

    # Apply ENABLED_SERVICES filter
    enabled_names = [
        n.strip() for n in os.environ.get("ENABLED_SERVICES", "").split(",")
        if n.strip()
    ]
    if enabled_names:
        all_svcs = [s for s in all_svcs if s.name in enabled_names]

    free_svcs = [s for s in all_svcs if len(s.envs) == 0]
    paid_svcs = [s for s in all_svcs if len(s.envs) > 0]

    print("Available translation services:")
    print()

    if free_svcs:
        print("  [ Free -- no API key required ]")
        for s in free_svcs:
            print(f"    * {s.name}")
        print()

    if paid_svcs:
        print("  [ Paid -- API key required, higher quality ]")
        for s in paid_svcs:
            env_keys = ", ".join(s.envs.keys())
            print(f"    * {s.name:20s}  ({env_keys})")
        print()

    # Step 2: Get service name from user
    while True:
        choice = input("Service name (or 'q' to quit): ").strip().lower()
        if choice in ("q", "quit", ""):
            print("Setup cancelled.")
            return 1
        translator_cls = TranslatorRegistry.get(choice)
        if translator_cls is not None:
            break
        print(f"  Unknown service '{choice}'. Type a name from the list above.")
        print()

    print()
    print(f"Selected: {translator_cls.name}")
    print()

    # Step 3: Collect credentials
    envs = {}
    svc_envs = translator_cls.envs

    if len(svc_envs) == 0:
        print("This service requires no configuration.")
    else:
        print("Enter credentials (press Enter to use default, skip optional fields):")
        print()
        for key, default in svc_envs.items():
            is_secret = any(
                p in key.upper() for p in ("API_KEY", "TOKEN", "SECRET", "PASSWORD")
            )
            is_url = "URL" in key.upper() or "ENDPOINT" in key.upper() or "HOST" in key.upper()

            if is_secret:
                prompt = f"  {key}"
                if default:
                    prompt += f" [default: {'*' * 8}]"
                prompt += ": "
                value = input(prompt).strip()
                if value:
                    envs[key] = value
                elif default is not None:
                    envs[key] = default
            elif is_url:
                prompt = f"  {key}"
                if default:
                    prompt += f" [default: {default}]"
                prompt += ": "
                value = input(prompt).strip()
                if value:
                    envs[key] = value
                elif default is not None:
                    envs[key] = default
            else:
                prompt = f"  {key}"
                if default:
                    prompt += f" [default: {default}]"
                prompt += " (optional): "
                value = input(prompt).strip()
                if value:
                    envs[key] = value
                elif default is not None:
                    envs[key] = default

    print()

    # Step 4: Test connection
    print("Testing connection...")
    try:
        instance = translator_cls("en", "zh", None, envs=envs)
        import time
        start = time.time()
        result = instance.do_translate("Hello")
        elapsed = round((time.time() - start) * 1000)
        print(f"  [OK] Success! Translated 'Hello' -> '{result}' ({elapsed}ms)")
    except Exception as e:
        print(f"  [FAIL] Connection test failed: {e}")
        save_anyway = input("  Save configuration anyway? [y/N]: ").strip().lower()
        if save_anyway != "y":
            print("Setup cancelled.")
            return 1
        print("  Saving without verification...")

    # Step 5: Persist
    ConfigManager.set_translator_by_name(translator_cls.name, envs)
    ConfigManager.set_last_used_service(translator_cls.name)

    print()
    print("=" * 56)
    print(f"  [OK] Service '{translator_cls.name}' configured successfully!")
    print(f"  Configuration saved to:")
    print(f"    ~/.config/PDFMathTranslate/config.json")
    print()
    print("  You can now translate documents:")
    print(f"    pdf2zh document.pdf -s {translator_cls.name}")
    print(f"    pdf2zh document.pdf                  (uses last configured service)")
    print("=" * 56)

    return 0


def find_all_files_in_directory(directory_path):
    """
    Recursively search all PDF files in the given directory and return their paths as a list.

    :param directory_path: str, the path to the directory to search
    :return: list of PDF file paths
    """
    # Check if the provided path is a directory
    if not os.path.isdir(directory_path):
        raise ValueError(f"The provided path '{directory_path}' is not a directory.")

    file_paths = []

    # Walk through the directory recursively
    for root, _, files in os.walk(directory_path):
        for file in files:
            # Check if the file is a PDF
            if file.lower().endswith((".pdf", ".doc", ".docx")):
                # Append the full file path to the list
                file_paths.append(os.path.join(root, file))

    return file_paths


def main(args: Optional[List[str]] = None) -> int:
    parsed_args = parse_args(args)

    from rich.logging import RichHandler

    logging.basicConfig(level=logging.INFO, handlers=[RichHandler()])

    # disable httpx, openai, httpcore, http11 logs
    logging.getLogger("httpx").setLevel("CRITICAL")
    logging.getLogger("httpx").propagate = False
    logging.getLogger("openai").setLevel("CRITICAL")
    logging.getLogger("openai").propagate = False
    logging.getLogger("httpcore").setLevel("CRITICAL")
    logging.getLogger("httpcore").propagate = False
    logging.getLogger("http11").setLevel("CRITICAL")
    logging.getLogger("http11").propagate = False

    if parsed_args.config:
        from pdf2zh.config import ConfigManager

        ConfigManager.custome_config(parsed_args.config)

    if parsed_args.setup:
        return setup_wizard()

    if parsed_args.debug:
        log.setLevel(logging.DEBUG)

    from pdf2zh.doclayout import ModelInstance, OnnxModel, set_backend

    set_backend(parsed_args.backend)

    if parsed_args.onnx:
        ModelInstance.value = OnnxModel(parsed_args.onnx)
    else:
        ModelInstance.value = OnnxModel.load_available()

    if parsed_args.interactive:
        from pdf2zh.gui import setup_gui

        if parsed_args.serverport:
            setup_gui(
                parsed_args.share, parsed_args.authorized, int(parsed_args.serverport)
            )
        else:
            setup_gui(parsed_args.share, parsed_args.authorized)
        return 0

    if parsed_args.prompt:
        try:
            with open(parsed_args.prompt, "r", encoding="utf-8") as file:
                content = file.read()
            parsed_args.prompt = Template(content)
        except Exception:
            raise ValueError("prompt error.")

    if parsed_args.mcp:
        logging.getLogger("mcp").setLevel(logging.ERROR)
        from pdf2zh.mcp_server import create_mcp_app, create_starlette_app

        mcp = create_mcp_app()
        if parsed_args.sse:
            import uvicorn

            starlette_app = create_starlette_app(mcp._mcp_server)
            uvicorn.run(starlette_app)
            return 0
        mcp.run()
        return 0

    print(parsed_args)

    if parsed_args.babeldoc:
        return yadt_main(parsed_args)

    # Unified kernel routing — both fast and precise modes go through the registry
    from pdf2zh.kernel import KernelRegistry
    from pdf2zh.kernel.protocol import TranslateRequest

    KernelRegistry.switch(parsed_args.mode)  # "fast" or "precise"
    kernel = KernelRegistry.get()

    if parsed_args.dir:
        parsed_args.files = find_all_files_in_directory(parsed_args.files[0])

    # Extract prompt text (may be a Template object from file reading above)
    prompt_text = None
    if parsed_args.prompt:
        prompt_text = (
            parsed_args.prompt.template
            if hasattr(parsed_args.prompt, "template")
            else parsed_args.prompt
        )

    request = TranslateRequest(
        files=parsed_args.files,
        output=parsed_args.output,
        pages=parsed_args.pages,
        lang_in=parsed_args.lang_in,
        lang_out=parsed_args.lang_out,
        service=parsed_args.service,
        thread=parsed_args.thread,
        vfont=parsed_args.vfont,
        vchar=parsed_args.vchar,
        envs={},
        prompt=prompt_text,
        skip_subset_fonts=parsed_args.skip_subset_fonts,
        ignore_cache=parsed_args.ignore_cache,
        compatible=parsed_args.compatible,
        debug=parsed_args.debug,
    )
    kernel.translate(request)
    return 0


def yadt_main(parsed_args) -> int:
    from babeldoc.high_level import async_translate as yadt_translate
    from babeldoc.high_level import init as yadt_init
    from babeldoc.main import create_progress_handler
    from babeldoc.translation_config import TranslationConfig as YadtConfig
    from pdf2zh.high_level import download_remote_fonts

    if parsed_args.dir:
        untranlate_file = find_all_files_in_directory(parsed_args.files[0])
    else:
        untranlate_file = parsed_args.files
    lang_in = parsed_args.lang_in
    lang_out = parsed_args.lang_out
    ignore_cache = parsed_args.ignore_cache
    outputdir = None
    if parsed_args.output:
        outputdir = parsed_args.output

    # yadt require init before translate
    yadt_init()
    font_path = download_remote_fonts(lang_out.lower())

    param = parsed_args.service.split(":", 1)
    service_name = param[0]
    service_model = param[1] if len(param) > 1 else None

    envs = {}
    prompt = []

    if parsed_args.prompt:
        try:
            with open(parsed_args.prompt, "r", encoding="utf-8") as file:
                content = file.read()
            prompt = Template(content)
        except Exception:
            raise ValueError("prompt error.")

    from pdf2zh.translator import TranslatorRegistry

    translator_cls = TranslatorRegistry.get(service_name)
    if translator_cls is None:
        raise ValueError(f"Unsupported translation service: {service_name}")
    translator = translator_cls(
        lang_in,
        lang_out,
        service_model,
        envs=envs,
        prompt=prompt,
        ignore_cache=ignore_cache,
    )
    import asyncio

    for file in untranlate_file:
        file = file.strip("\"'")
        _converted_pdf = None
        if is_convertible(file):
            _converted_pdf = convert_to_pdf(file)
            file = _converted_pdf
        yadt_config = YadtConfig(
            input_file=file,
            font=font_path,
            pages=",".join((str(x) for x in getattr(parsed_args, "raw_pages", []))),
            output_dir=outputdir,
            doc_layout_model=None,
            translator=translator,
            debug=parsed_args.debug,
            lang_in=lang_in,
            lang_out=lang_out,
            no_dual=False,
            no_mono=False,
            qps=parsed_args.thread,
        )

        async def yadt_translate_coro(yadt_config):
            progress_context, progress_handler = create_progress_handler(yadt_config)
            # 开始翻译
            with progress_context:
                async for event in yadt_translate(yadt_config):
                    progress_handler(event)
                    if yadt_config.debug:
                        logger.debug(event)
                    if event["type"] == "finish":
                        result = event["translate_result"]
                        logger.info("Translation Result:")
                        logger.info(f"  Original PDF: {result.original_pdf_path}")
                        logger.info(f"  Time Cost: {result.total_seconds:.2f}s")
                        logger.info(f"  Mono PDF: {result.mono_pdf_path or 'None'}")
                        logger.info(f"  Dual PDF: {result.dual_pdf_path or 'None'}")
                        break

        asyncio.run(yadt_translate_coro(yadt_config))
        if _converted_pdf:
            try:
                os.unlink(_converted_pdf)
            except OSError:
                pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
