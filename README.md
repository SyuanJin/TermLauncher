# TermLauncher

<p align="center">
  <img src="assets/icon.png" alt="TermLauncher" width="128">
</p>

<p align="center">
  <strong>One-click terminal launch, straight to your working directory</strong>
</p>

<p align="center">
  <a href="README_zh-TW.md">繁體中文</a> | English
</p>

---

## Introduction

TermLauncher is a cross-platform desktop application that lets you quickly launch a terminal and automatically navigate to a specified working directory. On Windows, it supports **WSL**, **PowerShell**, **Git Bash**, and more. Experimental support is also available for macOS and Linux. It is designed for developers who frequently switch between different project directories.

## Features

| Feature                    | Description                                                                     |
| -------------------------- | ------------------------------------------------------------------------------- |
| **Multi-Terminal Support** | WSL, PowerShell, Git Bash, CMD, and custom terminals                            |
| **Directory Grouping**     | Organize projects by work, personal, learning, etc.                             |
| **Favorites**              | Mark frequently used directories for quick access                               |
| **Search & Filter**        | Quickly find directories by name, path, or group                                |
| **Recent History**         | View recently opened directories with configurable limit                        |
| **Custom Terminals**       | Define custom terminal commands and arguments                                   |
| **Drag & Drop Sorting**    | Reorder favorites, groups, and directories via drag and drop                    |
| **Context Menu**           | Right-click for quick actions (select terminal, add to favorites, edit, delete) |
| **Invalid Path Warning**   | Automatically detect and highlight invalid paths                                |
| **Auto Launch**            | Start on boot (supports both Portable and installer editions)                   |
| **Advanced Export/Import** | Selective export, merge/overwrite import                                        |
| **Keyboard Shortcuts**     | Global hotkey and in-app shortcuts                                              |
| **Theme Switching**        | Dark / Light theme                                                              |
| **Multi-Language**         | 繁體中文, English                                                               |

## Keyboard Shortcuts

### Global

| Shortcut  | Action                            |
| --------- | --------------------------------- |
| Alt+Space | Show / hide window (customizable) |

### In-App

| Shortcut | Action                     |
| -------- | -------------------------- |
| Ctrl+1~5 | Switch tabs                |
| Ctrl+N   | Add new directory          |
| Ctrl+F   | Focus search               |
| Escape   | Close modal / clear search |
| Enter    | Open selected directory    |

## Installation

### Option 1: Download exe (Recommended)

1. Go to the [Releases](../../releases) page
2. Download `TermLauncher-Portable.exe`
3. Double-click to run

### Option 2: Run from source

```bash
# Clone the repository
git clone https://github.com/SyuanJin/TermLauncher.git
cd TermLauncher

# Install dependencies
npm install

# Run
npm start
```

### Option 3: Build from source

```bash
# Build Portable edition
npm run build

# Build Installer edition
npm run build:installer
```

## Usage

### Add a Directory

1. Click the expand button
2. Enter a name and select a path
3. Choose a terminal (WSL, PowerShell, Git Bash, Custom)
4. Click "Add Directory"

### Open Terminal

Simply **click a directory card** to launch the terminal.

### Path Conversion

Windows paths are automatically converted to WSL format:

```
D:\Projects\my-app  →  /mnt/d/Projects/my-app
```

## Documentation

| Document                                | Description                     |
| --------------------------------------- | ------------------------------- |
| [PRD.md](docs/PRD.md)                   | Product Requirements Document   |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technical Architecture Document |
| [UI_DESIGN.md](docs/UI_DESIGN.md)       | UI Design Specification         |
| [CHANGELOG.md](docs/CHANGELOG.md)       | Version Changelog               |

## System Requirements

### Windows (Full Support)

- Windows 10 (1903+) / Windows 11
- [Windows Terminal](https://aka.ms/terminal)
- WSL 2 + Ubuntu (if using WSL features)

### macOS (Experimental)

- macOS 10.15 (Catalina) or later
- Supported terminals: Terminal.app, iTerm2, Hyper, Warp, Alacritty, Kitty
- Must build from source (`npm run build:mac`)

### Linux (Experimental)

- Ubuntu 20.04+ / Fedora 35+ / Arch Linux and other major distributions
- Supported terminals: GNOME Terminal, Konsole, Tilix, Alacritty, Kitty, xterm, Terminator
- Must build from source (`npm run build:linux`)

> **Note:** macOS and Linux support is currently experimental. Some features may not work as expected. Bug reports are welcome!

## Tech Stack

- **Electron** - Cross-platform desktop application framework
- **Node.js** - Backend runtime
- **HTML/CSS/JS** - Frontend UI (vanilla ES Modules, no framework)
- **Vitest** - Unit testing framework
- **ESLint** - Code linting
- **Prettier** - Code formatting

## License

MIT License © 2026
