# Rabto Ixta

Instagram data extraction tool — lookup user IDs, view full-size profile pictures, and explore similar accounts.

## Quick Start

### Run from GitHub

Requirements:
- Node.js 22 LTS
- npm
- Internet connection
- A RapidAPI key may be required depending on configured mode

Commands:
```bash
git clone https://github.com/Priyanshuf1/rabto-ixta.git
cd rabto-ixta
npm install
npm run build
npm start
```

Rabto Ixta starts a local server and automatically opens the browser.

Default URL:
http://localhost:3002

When the port is occupied, another available port is selected automatically.

### Download ZIP

1. Click **Code**.
2. Click **Download ZIP**.
3. Extract the ZIP.
4. Open a terminal inside the folder.
5. Run:
```bash
npm install
npm run build
npm start
```

### CLI Options

**Do not automatically open browser**
```bash
npm start -- --no-open
```
or 
```bash
rabto-ixta --no-open
```

**Use another port**
```bash
npm start -- --port 4000
```

### Development
To run frontend and backend concurrently in dev mode:
```bash
npm run dev
```

## Environment Configuration

To configure environment variables (like BYOK API keys), copy the template file:

```bash
cp .env.example .env
```

Open `.env` and fill in the values. **Users must never commit their .env file.**

## Important Explanation

GitHub hosts the project files. The localhost application opens only after the project is downloaded, installed and started on the user's computer.

## Troubleshooting

- **Node.js version problem**: Ensure you are running Node.js 22+.
- **npm install failure**: Try deleting `node_modules` and re-running `npm install`.
- **Frontend build missing**: The `npm start` launcher will tell you if the frontend build is missing. Run `npm run setup` or `npm run build`.
- **Port already occupied**: The launcher will automatically select another free port. You can also explicitly specify one using `--port`.
- **Browser did not open**: Run with `--no-open` or open `http://localhost:3002` manually in your browser.
- **API key missing**: Make sure you have configured your RapidAPI key in the UI or backend if using BYOK.
- **API quota exhausted**: Ensure your RapidAPI plan has enough requests. Wait for the quota to reset.
- **Backend did not start**: Check the terminal for error logs.
- **Windows PowerShell path issue**: Ensure Node and npm are in your PATH.
- **Permission errors**: Run the terminal as administrator (Windows) or use `sudo` carefully on Linux/macOS.
- **How to stop the application**: Press `Ctrl+C` in the terminal where it is running.
