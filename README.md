# PulseSummary 🚀

An AI-powered academic dashboard designed to revolutionize how students and researchers interact with educational content.

[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)](https://expressjs.com/)

## 📖 Overview

**PulseSummary** is a comprehensive academic tool that leverages the power of Google Gemini AI to help users synthesize vast amounts of information quickly. Whether you're dealing with dense research PDFs or lecture transcripts, PulseSummary transforms raw source material into structured, professional study notes.

## ✨ Key Features

- **🧠 Neural Notes Generation**: Instantly convert lecture transcripts or textbook chapters into well-structured Markdown notes.
- **📄 Smart PDF Extraction**: Upload research papers and extract key insights using a highly optimized server-side processing engine.
- **📚 Curated Library**: Explore a trending collection of educational resources across Science, Design, and Technology.
- **🔄 Multi-Mode Processing**: Switch between file-based extraction and direct text input for maximum flexibility.
- **🌓 Adaptive Interface**: A modern bento-grid dashboard with full support for Dark and Light modes.
- **🧪 Academic Performance Tracking**: Monitor your study habits and research activity via an integrated analytics dashboard.

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS, Motion (Framer Motion) |
| **Backend** | Node.js, Express.js |
| **AI Engine** | Google Gemini AI (`@google/genai`) |
| **PDF Processing** | `pdf-parse`, `jspdf`, `pdf-lib` |
| **Icons** | Lucide React |

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### Local Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/pulse-summary.git
   cd pulse-summary
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your credentials:
   ```env
   GEMINI_API_KEY="your_api_key_here"
   APP_URL="http://localhost:3000"
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open the application:**
   Navigate to `http://localhost:3000` in your browser.

## 📝 Scripts

- `npm run dev`: Starts the backend server with `tsx` and hot-reloads the frontend via Vite middleware.
- `npm run build`: Builds the production-ready frontend bundle.
- `npm run lint`: Performs type-checking across the codebase.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## ⚖️ License

This project is licensed under the MIT License.

---

*Built for academic excellence with PulseSummary.*
