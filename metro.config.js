// Patch Node fs with graceful-fs to prevent EMFILE (too many open files) on Windows
try {
  const gracefulFs = require("graceful-fs");
  gracefulFs.gracefulify(require("fs"));
} catch {
  // graceful-fs optional fallback
}

const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Escape backslashes for Windows path in RegExp
const rootDistEscaped = path.resolve(__dirname, "dist").replace(/\\/g, "\\\\");

// Safely block only root build/git folders without affecting node_modules/ package dist folders
const extraBlockList = [
  new RegExp("^" + rootDistEscaped + "([\\\\/].*)?$"),
  /[/\\]\.git([\\/].*)?$/,
  /[/\\]\.vscode[\\/]/,
  /[/\\]\.claude[\\/]/,
];

if (Array.isArray(config.resolver.blockList)) {
  config.resolver.blockList.push(...extraBlockList);
} else {
  config.resolver.blockList = extraBlockList;
}

module.exports = withNativeWind(config, { input: "./global.css" });
