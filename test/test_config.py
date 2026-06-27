"""Tests for ConfigManager first-time-setup detection methods.

These guard the MCP setup wizard's ability to detect whether a user
has ever configured a translation service.
"""

import unittest

from pdf2zh.config import ConfigManager


class TestConfigManagerSetupDetection(unittest.TestCase):

    def setUp(self):
        # Start with a clean slate for each test
        ConfigManager.clear()

    def tearDown(self):
        ConfigManager.clear()

    def test_is_configured_false_when_no_translators(self):
        """Empty config → is_configured() returns False."""
        self.assertFalse(ConfigManager.is_configured())

    def test_is_configured_true_after_adding_translator(self):
        """Setting a translator → is_configured() returns True."""
        ConfigManager.set_translator_by_name("deepseek", {
            "DEEPSEEK_API_KEY": "sk-test-key",
            "DEEPSEEK_MODEL": "deepseek-chat",
        })
        self.assertTrue(ConfigManager.is_configured())

    def test_is_configured_true_for_free_service_translator(self):
        """Even free services (no API key envs) count as configured."""
        ConfigManager.set_translator_by_name("google", {})
        self.assertTrue(ConfigManager.is_configured())

    def test_get_configured_service_names_empty(self):
        """No translators → empty list."""
        self.assertEqual(ConfigManager.get_configured_service_names(), [])

    def test_get_configured_service_names_multiple(self):
        """Returns names of all configured services."""
        ConfigManager.set_translator_by_name("openai", {
            "OPENAI_API_KEY": "sk-abc",
            "OPENAI_MODEL": "gpt-4o",
        })
        ConfigManager.set_translator_by_name("deepseek", {
            "DEEPSEEK_API_KEY": "sk-def",
        })
        names = ConfigManager.get_configured_service_names()
        self.assertIn("openai", names)
        self.assertIn("deepseek", names)
        self.assertEqual(len(names), 2)

    def test_get_last_used_service_returns_none_when_no_translators(self):
        """No translators + no last_used → None."""
        self.assertIsNone(ConfigManager.get_last_used_service())

    def test_get_last_used_service_falls_back_to_first_translator(self):
        """Without explicit last_used, returns first configured translator."""
        ConfigManager.set_translator_by_name("deepl", {
            "DEEPL_AUTH_KEY": "key-123",
        })
        self.assertEqual(ConfigManager.get_last_used_service(), "deepl")

    def test_set_last_used_service_persisted(self):
        """set_last_used_service takes priority over first translator."""
        ConfigManager.set_translator_by_name("deepl", {"DEEPL_AUTH_KEY": "a"})
        ConfigManager.set_translator_by_name("google", {})
        ConfigManager.set_last_used_service("deepseek")
        self.assertEqual(ConfigManager.get_last_used_service(), "deepseek")

    def test_set_last_used_service_survives_reload(self):
        """Last used service persists across ConfigManager instance access."""
        ConfigManager.set_translator_by_name("openai", {"OPENAI_API_KEY": "k"})
        ConfigManager.set_last_used_service("openai")

        # Access via classmethod again — should still read persisted value
        self.assertEqual(ConfigManager.get_last_used_service(), "openai")


if __name__ == "__main__":
    unittest.main()
