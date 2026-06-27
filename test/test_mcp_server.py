"""Tests for MCP server tools.

These tests mock the 'mcp' package since it may not be installed
in all development environments. They validate the core logic:
- Service listing
- Service resolution from ConfigManager
- Configuration detection
- Translation orchestration
"""

import json
import os
import sys
import unittest
from unittest import mock

# Mock the mcp package before importing mcp_server
_mcp_mock = mock.MagicMock()
_mcp_mock.server = mock.MagicMock()
_mcp_mock.server.fastmcp = mock.MagicMock()
_mcp_mock.server.sse = mock.MagicMock()
sys.modules["mcp"] = _mcp_mock
sys.modules["mcp.server"] = _mcp_mock.server
sys.modules["mcp.server.fastmcp"] = _mcp_mock.server.fastmcp
sys.modules["mcp.server.sse"] = _mcp_mock.server.sse
# Mock starlette
_starlette_mock = mock.MagicMock()
sys.modules["starlette.applications"] = _starlette_mock
sys.modules["starlette.requests"] = mock.MagicMock()
sys.modules["starlette.routing"] = mock.MagicMock()
sys.modules["sse_starlette"] = mock.MagicMock()
sys.modules["sse_starlette.sse"] = mock.MagicMock()

from pdf2zh.config import ConfigManager
from pdf2zh.mcp_server import _services_for_agent, _ensure_translators_loaded


class TestMcpServiceListing(unittest.TestCase):
    """Test _services_for_agent() returns correct metadata."""

    def test_services_list_includes_google(self):
        """Google translator (free) should be in the list."""
        services = _services_for_agent()
        names = [s["name"] for s in services]
        self.assertIn("google", names)

    def test_free_services_marked_as_free(self):
        """Services with no envs (Google, Bing, Argos) are marked free."""
        services = _services_for_agent()
        for s in services:
            if s["name"] in ("google", "bing", "argos"):
                self.assertTrue(s["free"], f"{s['name']} should be free")

    def test_paid_services_have_envs(self):
        """Services with API keys should have envs and not be free."""
        services = _services_for_agent()
        for s in services:
            if s["name"] in ("openai", "deepseek", "deepl"):
                self.assertFalse(s["free"], f"{s['name']} should not be free")
                self.assertGreater(len(s["envs"]), 0, f"{s['name']} should have envs")

    def test_service_has_env_metadata(self):
        """Each env entry has 'default', 'required', 'is_secret' keys."""
        services = _services_for_agent()
        for s in services:
            for key, meta in s["envs"].items():
                self.assertIn("default", meta)
                self.assertIn("required", meta)
                self.assertIn("is_secret", meta)


class TestMcpConfigIntegration(unittest.TestCase):
    """Test ConfigManager methods used by MCP tools."""

    def setUp(self):
        ConfigManager.clear()

    def tearDown(self):
        ConfigManager.clear()

    def test_unconfigured_state(self):
        """Fresh config → is_configured() False, no services."""
        self.assertFalse(ConfigManager.is_configured())
        self.assertEqual(ConfigManager.get_configured_service_names(), [])
        self.assertIsNone(ConfigManager.get_last_used_service())

    def test_configured_after_setup(self):
        """After set_translator_by_name, is_configured() True."""
        ConfigManager.set_translator_by_name("openai", {
            "OPENAI_API_KEY": "sk-test",
            "OPENAI_MODEL": "gpt-4o",
        })
        self.assertTrue(ConfigManager.is_configured())
        self.assertIn("openai", ConfigManager.get_configured_service_names())

    def test_last_used_service_persistence(self):
        """set_last_used_service takes priority."""
        ConfigManager.set_translator_by_name("google", {})
        ConfigManager.set_last_used_service("deepseek")
        self.assertEqual(ConfigManager.get_last_used_service(), "deepseek")


if __name__ == "__main__":
    unittest.main()
