# Interview Question Generator

Build a simple web app in Next.js that takes a candidate's resume as input and generates a set of interview questions for an interviewer using a free, open-source AI model.

The tool is intended for interviewers: they will upload or paste a resume, and the app will analyze it and generate a tailored question set the interviewer can use in a real interview.

**Built by:** Vinayak Raj Ranjan  
**For:** Arkaana AI

![Interview Question Generator](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![Groq AI](https://img.shields.io/badge/Groq-AI-orange?style=for-the-badge)

---

## 📋 Table of Contents

- [Features](#-features)
- [Quick Demo](#-quick-demo)
- [Project Setup](#-project-setup)
- [How to Run Locally](#-how-to-run-locally)
- [Assumptions & Limitations](#-assumptions--limitations)

---

## ✨ Features

### Core Functionality
- **Multiple Input Methods**
  - Upload resume files (PDF, DOCX, TXT) 
  - Paste resume text directly into a text area
  - Automatic text extraction from uploaded files

- **AI-Powered Question Generation**
  - Uses Groq's Llama 3.3 70B model (FREE)
  - Generates 10-15 tailored interview questions per resume
  - Intelligent analysis of candidate background and experience

- **Smart Categorization**
  - Automatically organizes questions into categories:
    - **Technical Skills** - Technologies, frameworks, tools
    - **Projects & Experience** - Past projects and achievements
    - **Work Experience** - Professional background
    - **Behavioral & Soft Skills** - Teamwork, leadership, communication
    - **Problem-Solving** - Critical thinking and analytical approaches

### User Experience
- **Modern, Responsive UI**
  - Beautiful gradient backgrounds with animated elements
  - Dark mode support (automatic based on system preferences)
  - Smooth animations and transitions

- **Advanced Filtering & Search**
  - Real-time search across all questions
  - Filter by category dropdown
  - Combined search and category filtering
  - Shows filtered vs. total question count

- **Export & Sharing**
  - One-click copy all questions
  - Download questions as PDF with formatting
  - Respects active filters (only copies/downloads filtered questions)
  - PDF includes date, filter info, and pagination

- **Performance**
  - Fast question generation (typically 5-15 seconds)
  - Client-side file processing
  - Optimized for large resumes
  - Smooth loading states

---

## 🎬 Quick Demo

### Step 1: Input Resume
Choose one of two methods:
- **Upload File**: Drag & drop or click to upload a PDF, DOCX, or TXT file
- **Paste Text**: Copy and paste resume content directly

### Step 2: Generate Questions
Click the "Generate Questions" button and wait for AI analysis (5-15 seconds)

### Step 3: Review & Export
- Browse questions organized by category
- Use search to find specific questions
- Filter by category
- Copy all questions or download as PDF

### Visual Flow
```
[Upload/Paste Resume] → [AI Analysis] → [Categorized Questions] → [Search/Filter] → [Copy/Download]
```

---

## 🚀 Project Setup

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.0 or higher ([Download](https://nodejs.org/))
- **npm**, **yarn**, or **pnpm** package manager
- **Groq API Key** (FREE - [Get one here](https://console.groq.com/))

### Installation Steps

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd question_generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```
   
   **How to get your free Groq API key:**
   1. Visit [https://console.groq.com/](https://console.groq.com/)
   2. Sign up for a free account (no credit card required)
   3. Navigate to API Keys section
   4. Create a new API key
   5. Copy the key and paste it into your `.env.local` file

4. **Verify installation**
   ```bash
   npm run build
   ```
   This should complete without errors if everything is set up correctly.

---

## 💻 How to Run Locally

### Development Mode

1. **Start the development server:**
   ```bash
   npm run dev
   # or
   pnpm dev
   # or
   yarn dev
   ```

2. **Open your browser:**
   
   Navigate to [http://localhost:3000](http://localhost:3000)
   
   You should see the application homepage with:
   - Header: "Smart Question Generator"
   - Input method toggle (Paste Text / Upload File)
   - Input area or file upload zone

3. **Test the application:**
   - Try pasting a sample resume text
   - Or upload a test PDF/DOCX file
   - Click "Generate Questions"
   - Wait for questions to appear (5-15 seconds)

---

## ⚠️ Assumptions & Limitations

### Assumptions

1. **Resume Format**
   - Assumes resumes contain standard information (skills, experience, projects)
   - Works best with well-structured, text-based resumes
   - May have reduced accuracy with heavily formatted or image-based resumes

2. **Question Quality**
   - Questions are generated based on AI interpretation of resume content
   - May require human review and refinement
   - Quality depends on resume clarity and detail level

3. **File Processing**
   - PDF files: Extracts text only (no images, tables, or complex layouts)
   - DOCX files: Extracts plain text (formatting may be lost)
   - TXT files: Direct text extraction
   - Maximum file size: 10MB

4. **API Usage**
   - Assumes Groq API is accessible and within rate limits
   - Free tier: 30 requests per minute
   - No persistent storage of resumes or questions

### Limitations

1. **File Format Support**
   - ✅ Supported: PDF, DOCX, TXT
   - ❌ Not supported: Images (JPG, PNG), Word DOC (old format), RTF, HTML


2. **API Constraints**
   - Rate limited to 30 requests/minute (free tier)
   - No offline functionality
   - Requires internet connection
   - API key must be valid and active

3. **Browser Compatibility**
   - Requires modern browser with JavaScript enabled
   - File upload uses HTML5 File API
   - PDF.js requires browser support for Web Workers

4. **Data Privacy**
   - Resumes are sent to Groq API for processing
   - No data is stored locally or on server
   - Users should be aware of data transmission

7. **Language Support**
   - Optimized for English resumes
   - May work with other languages but quality may vary


---

## Acknowledgments

- **Groq** for providing free, fast AI inference
- **Vercel** for the excellent AI SDK
- **Next.js** team for the amazing framework
- **Open source community** for the various libraries used

---

## Thank You

I enjoyed working on this project and learned so many things along the way. Thanks to the Arkaana AI team for this opportunity and for the valuable learning experience.

---

# Intelligent-Interview-Question-Generator
