> [!NOTE]
> When a file is encrypted locally—independent of servers and their processes—the responsibility for encryption lies solely with you. This project was created to provide a method of encryption that does not depend on corporations or the methods they use.

# <img src="icon.png" width="28"> RoundAway

**RoundAway** is a portable cryptographic tool designed for secure and private communication. Built with **Electron** and **Node.js**, it provides encrypted messaging and file exchange capabilities in a lightweight desktop application.

## 📁 Project Structure

```

RoundAway/
├── src/
│   ├── index.html    # UI (HTML / JavaScript)
│   ├── main.js       # Electron main process
│   ├── preload.js    # Secure bridge (renderer ↔ main)
│   └── style.css     # UI styling
├── icon.ico          # Application icon
├── package.json      # Project configuration and dependencies
└── readme.md         # Documentation

````

## 🚀 Getting Started

### 1. Install dependencies
```bash
# Enter this in the terminal / PowerShell
npm install
````

### 2. Run in development mode
```bash
# Enter this in the terminal / PowerShell
npm start
```
## 🏗️ Build Instructions
To create a production build:
```bash
# Enter this in the terminal / PowerShell
npm run build
```
The final output will be generated in the `/dist` directory.
## 🔐 Encryption Algorithms & Methods

RoundAway supports multiple symmetric encryption algorithms:

| Algorithm    | Key Size | Mode   | Notes           |
| ------------ | -------- | ------ | --------------- |
| AES-256-GCM  | 256-bit  | GCM    | Recommended     |
| AES-192-GCM  | 192-bit  | GCM    |                 |
| AES-128-GCM  | 128-bit  | GCM    |                 |
| AES-256-CBC  | 256-bit  | CBC    | Default         |
| AES-192-CBC  | 192-bit  | CBC    |                 |
| AES-128-CBC  | 128-bit  | CBC    |                 |
| CAMELLIA-256 | 256-bit  | CBC    | ISO standard    |
| ChaCha20     | 256-bit  | Stream | Used in TLS 1.3 |

## 🔑 RSA Key Management

* `private.pem` — Private key (keep secret, never share)
* `public.pem` — Public key (safe to distribute)




