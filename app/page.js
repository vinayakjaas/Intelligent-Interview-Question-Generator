'use client';

import { useState, useRef, useEffect } from 'react';
import mammoth from 'mammoth';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';


export const dynamic = 'force-dynamic';

export default function Home() {
  const [resume, setResume] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [inputMode, setInputMode] = useState('paste'); // 'upload' or 'paste'
  const [showResults, setShowResults] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const fileInputRef = useRef(null);

  // Configure PDF.js worker
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('pdfjs-dist').then((module) => {
        module.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${module.version}/build/pdf.worker.min.mjs`;
      });
    }
  }, []);

  const extractTextFromFile = async (file) => {
    setExtracting(true);
    setError('');
    setFileName(file.name);

    try {
      const fileType = file.type;
      let extractedText = '';

      if (fileType === 'application/pdf') {
        const pdfjs = await import('pdfjs-dist');
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        const textPromises = [];

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          textPromises.push(pageText);
        }

        extractedText = textPromises.join('\n\n');
      } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                 file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } else if (fileType === 'text/plain' || file.name.endsWith('.txt')) {
        extractedText = await file.text();
      } else {
        throw new Error('Unsupported file type. Please upload PDF, DOCX, or TXT files.');
      }

      if (!extractedText.trim()) {
        throw new Error('No text could be extracted from the file. Please ensure the file contains readable text.');
      }

      setResume(extractedText);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to extract text from file');
      console.error('Error extracting text:', err);
      setFileName('');
    } finally {
      setExtracting(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file) => {
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB. Please upload a smaller file.');
      return;
    }

    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    const validExtensions = ['.pdf', '.docx', '.txt'];
    const isValidType = validTypes.includes(file.type) || 
                       validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isValidType) {
      setError('Unsupported file type. Please upload PDF, DOCX, or TXT files.');
      return;
    }

    await extractTextFromFile(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const generateQuestions = async () => {
    if (!resume.trim()) {
      setError('Please enter resume text');
      return;
    }

    setLoading(true);
    setError('');
    setQuestions([]);
    setShowResults(false);

    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resume }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate questions');
      }

      const data = await response.json();
      setQuestions(data.questions || []);
      setShowResults(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || 'An error occurred while generating questions');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyAllQuestions = () => {
    const questionsToCopy = (searchQuery || selectedCategory !== 'all') 
      ? filteredQuestions 
      : questions;
    
    if (questionsToCopy.length === 0) return;

    const questionsText = questionsToCopy
      .map((q, idx) => `${idx + 1}. [${q.category}] ${q.question}`)
      .join('\n\n');

    navigator.clipboard.writeText(questionsText);
    
    const button = document.getElementById('copy-button');
    const originalText = button.textContent;
    button.textContent = '✓ Copied!';
    button.classList.add('bg-green-600', 'hover:bg-green-700');
    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove('bg-green-600', 'hover:bg-green-700');
    }, 2000);
  };

  const downloadPDF = async () => {
    const questionsToDownload = (searchQuery || selectedCategory !== 'all') 
      ? filteredQuestions 
      : questions;
    
    if (questionsToDownload.length === 0) return;

    const { default: jsPDF } = await import('jspdf');
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;
    const lineHeight = 7;
    const categorySpacing = 10;

    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    const titleText = (searchQuery || selectedCategory !== 'all') 
      ? 'Filtered Interview Questions' 
      : 'Interview Questions';
    pdf.text(titleText, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += lineHeight * 2;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const date = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    pdf.text(`Generated on: ${date}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += lineHeight * 1.5;

    if (searchQuery || selectedCategory !== 'all') {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      let filterInfo = '';
      if (searchQuery && selectedCategory !== 'all') {
        filterInfo = `Filtered by: "${searchQuery}" and Category: "${selectedCategory}"`;
      } else if (searchQuery) {
        filterInfo = `Filtered by: "${searchQuery}"`;
      } else if (selectedCategory !== 'all') {
        filterInfo = `Filtered by Category: "${selectedCategory}"`;
      }
      pdf.text(filterInfo, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += lineHeight * 1.5;
    }

    const grouped = questionsToDownload.reduce((acc, question) => {
      if (!acc[question.category]) {
        acc[question.category] = [];
      }
      acc[question.category].push(question);
      return acc;
    }, {});

    Object.entries(grouped).forEach(([category, categoryQuestions]) => {
      if (yPosition > pageHeight - margin - 30) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(category, margin, yPosition);
      yPosition += lineHeight * 1.5;
      categoryQuestions.forEach((question, idx) => {
        if (yPosition > pageHeight - margin - 20) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        const questionText = `${idx + 1}. ${question.question}`;
        const splitText = pdf.splitTextToSize(questionText, pageWidth - 2 * margin - 10);
        
        pdf.text(splitText, margin + 5, yPosition);
        yPosition += lineHeight * splitText.length + 2;
      });

      yPosition += categorySpacing;
    });

    const pageCount = pdf.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text(
        `Page ${i} of ${pageCount} | Total Questions: ${questionsToDownload.length}${questions.length !== questionsToDownload.length ? ` (Filtered from ${questions.length})` : ''}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
    const filterSuffix = (searchQuery || selectedCategory !== 'all') ? '_Filtered' : '';
    const filename = `Interview_Questions${filterSuffix}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
  };

  const goBack = () => {
    setShowResults(false);
    setQuestions([]);
    setSearchQuery('');
    setSelectedCategory('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = searchQuery === '' || 
      question.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      question.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || question.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedQuestions = filteredQuestions.reduce((acc, question) => {
    if (!acc[question.category]) {
      acc[question.category] = [];
    }
    acc[question.category].push(question);
    return acc;
  }, {});

  const allCategories = ['all', ...Array.from(new Set(questions.map(q => q.category)))];

  const categoryColors = {
    'Skills': {
      bg: 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30',
      border: 'border-blue-200 dark:border-blue-800',
      icon: '💻',
      accent: 'text-blue-600 dark:text-blue-400'
    },
    'Projects': {
      bg: 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30',
      border: 'border-purple-200 dark:border-purple-800',
      icon: '🚀',
      accent: 'text-purple-600 dark:text-purple-400'
    },
    'Experience': {
      bg: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30',
      border: 'border-green-200 dark:border-green-800',
      icon: '💼',
      accent: 'text-green-600 dark:text-green-400'
    },
    'Behavioral': {
      bg: 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30',
      border: 'border-orange-200 dark:border-orange-800',
      icon: '🤝',
      accent: 'text-orange-600 dark:text-orange-400'
    },
    'Problem-Solving': {
      bg: 'bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30',
      border: 'border-pink-200 dark:border-pink-800',
      icon: '🧩',
      accent: 'text-pink-600 dark:text-pink-400'
    },
  };

  if (showResults && questions.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-300/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-7xl">
          <button
            onClick={goBack}
            className="mb-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
          >
            <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back to Input</span>
          </button>

          <div className="mb-8 sm:mb-12">
            <div className="text-left">
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-amber-500 dark:text-amber-400 mb-4">
                QUESTIONS GENERATED
              </p>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                Your personalized{' '}
                <span className="text-amber-600 dark:text-amber-500">interview</span> questions
              </h1>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
                {questions.length} tailored questions ready for your interview, powered by AI analysis
              </p>
            </div>
          </div>
          <div className="mb-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1">
                  Questions by Category
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {filteredQuestions.length} questions across {Object.keys(groupedQuestions).length} categories
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                <div className="relative flex-1 sm:flex-initial sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                      <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                  <input
                    id="search-questions"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search questions..."
                    className="w-full pl-12 pr-10 py-2.5 text-sm font-medium bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-2 border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white transition-all shadow-md hover:shadow-lg"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-gray-100 dark:hover:bg-slate-700 rounded-r-xl transition-colors"
                    >
                      <svg className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none z-10">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-xl group-hover:shadow-blue-500/40 transition-all">
                      <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                    </div>
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="appearance-none pl-14 pr-11 py-2.5 text-sm font-semibold bg-gradient-to-r from-white via-gray-50 to-white dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 backdrop-blur-sm border-2 border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-blue-500 dark:text-white transition-all shadow-lg hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer min-w-[180px] font-medium"
                  >
                    {allCategories.map((category) => {
                      const categoryInfo = category === 'all' 
                        ? { name: 'All Categories', icon: '📋' }
                        : {
                            name: category,
                            icon: categoryColors[category]?.icon || '📋'
                          };
                      return (
                        <option key={category} value={category}>
                          {categoryInfo.icon} {categoryInfo.name}
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center shadow-sm border border-gray-200 dark:border-slate-600">
                      <svg className="h-3.5 w-3.5 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              
                <div className="flex items-center gap-2">
                  <button
                    id="copy-button"
                    onClick={copyAllQuestions}
                    className="px-4 py-2.5 bg-gray-800 dark:bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-900 dark:hover:bg-gray-600 transition-all flex items-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 whitespace-nowrap text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={downloadPDF}
                    className="px-4 py-2.5 bg-blue-600 dark:bg-blue-700 text-white font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-all flex items-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 whitespace-nowrap text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              <p>
                Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredQuestions.length}</span> of{' '}
                <span className="font-semibold text-gray-900 dark:text-white">{questions.length}</span> questions
              </p>
              {filteredQuestions.length === 0 && questions.length > 0 && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {Object.keys(groupedQuestions).length === 0 ? (
            <div className="text-center py-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50">
              <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No questions found</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Try adjusting your search or filter criteria
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedQuestions).map(([category, categoryQuestions], catIdx) => {
              const categoryStyle = categoryColors[category] || categoryColors['Skills'];
              return (
                <div
                  key={category}
                  className={`rounded-3xl border-2 p-6 sm:p-8 ${categoryStyle.bg} ${categoryStyle.border} shadow-xl hover:shadow-2xl transition-all duration-300`}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-2xl sm:text-3xl shadow-lg`}>
                      {categoryStyle.icon}
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                        {category}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {categoryQuestions.length} {categoryQuestions.length === 1 ? 'question' : 'questions'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    {categoryQuestions.map((question, idx) => (
                      <div
                        key={idx}
                        className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 shadow-md border border-gray-200/50 dark:border-slate-700/50 hover:shadow-lg hover:scale-[1.01] transition-all duration-200"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${categoryStyle.accent} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center font-bold text-sm`}>
                            {idx + 1}
                          </div>
                          <p className="flex-1 text-gray-800 dark:text-gray-200 leading-relaxed text-sm sm:text-base">
                            {question.question}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-300/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-300/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        </div>
        
        <div className="fixed inset-0 opacity-30 dark:opacity-10 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}></div>
        </div>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-4xl">
        {/* Image in top left corner */}
        <div className="fixed top-4 left-8 sm:left-12 lg:left-16 z-50 hidden sm:block">
          <img 
            src="/img1.png" 
            alt="Decoration" 
            className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 object-contain opacity-80 hover:opacity-100 transition-opacity duration-300"
          />
        </div>
        
        <div className="mb-8 sm:mb-12">
          <div className="text-center">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-amber-500 dark:text-amber-400 mb-3">
              AI-POWERED INTERVIEW 
            </p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight flex items-center justify-center gap-2">
              Smart{' '}
              <span className="text-amber-600 dark:text-amber-500">Question</span> Generator
              <span className="inline-flex items-center w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20">
                <DotLottieReact
                  src="https://lottie.host/b8e95195-30de-49d7-a250-122c13762d0f/pfsxmwCFdV.lottie"
                  loop
                  autoplay
                />
              </span>
            </h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
              Transform resumes into comprehensive interview questions with intelligent AI-powered analysis
            </p>
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-blue-50/80 via-indigo-50/80 to-purple-50/80 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-blue-200/50 dark:border-slate-700/50 p-6 sm:p-8 lg:p-10 mb-8 transform transition-all duration-300 hover:shadow-3xl hover:scale-[1.01] group overflow-hidden">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-indigo-500/5 rounded-3xl"></div>
          </div>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-shimmer pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2.5 uppercase tracking-wide">
                Input Method
              </label>
              <div className="relative inline-flex items-center gap-1 p-1 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-xl shadow-inner">
                <div 
                  className={`absolute top-1 bottom-1 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 shadow-md transform transition-all duration-300 ease-out ${
                    inputMode === 'paste' ? 'left-1 right-1/2' : 'left-1/2 right-1'
                  }`}
                ></div>
                
                <button
                  type="button"
                  onClick={() => {
                    setInputMode('paste');
                    setFileName('');
                    setError('');
                  }}
                  className={`relative z-10 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                    inputMode === 'paste'
                      ? 'text-white scale-105'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <svg className={`w-4 h-4 transition-transform duration-300 ${inputMode === 'paste' ? 'scale-110' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span>Paste</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputMode('upload');
                    setResume('');
                    setFileName('');
                    setError('');
                  }}
                  className={`relative z-10 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                    inputMode === 'upload'
                      ? 'text-white scale-105'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <svg className={`w-4 h-4 transition-transform duration-300 ${inputMode === 'upload' ? 'scale-110' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span>Upload</span>
                  </div>
                </button>
              </div>
            </div>

            {inputMode === 'upload' && (
            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                Upload Resume File
              </label>
              <label
                htmlFor="file-upload"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center w-full h-32 sm:h-36 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden group ${
                  isDragging
                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 scale-[1.02] shadow-lg shadow-blue-500/20'
                    : 'border-gray-300 dark:border-slate-600 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-slate-800 dark:to-slate-800/50 hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-950/20 dark:hover:to-indigo-950/20 hover:shadow-xl hover:shadow-blue-500/10'
                }`}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-blue-400/10 via-purple-400/10 to-indigo-400/10"></div>
                <div className="relative z-10 flex flex-col items-center justify-center">
                  <div className={`relative w-12 h-12 sm:w-14 sm:h-14 mb-3 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    isDragging 
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 scale-110 shadow-lg shadow-blue-500/50 animate-pulse-glow' 
                      : 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 group-hover:scale-105 group-hover:shadow-md'
                  }`}>
                    <svg className={`w-6 h-6 sm:w-7 sm:h-7 transition-all duration-300 ${isDragging ? 'text-white animate-bounce' : 'text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="mb-1 text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
                    {isDragging ? 'Drop your file here' : 'Drag & drop your resume'}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2">
                    or <span className="text-blue-600 dark:text-blue-400 font-semibold">browse files</span>
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Supports PDF, DOCX, TXT • Max 10MB
                  </p>
                </div>
                <input
                  id="file-upload"
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={handleFileChange}
                  disabled={loading || extracting}
                />
              </label>
              
              {fileName && (
                <div className="mt-4 flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <img
                      src="https://img.icons8.com/color/48/000000/pdf.png"
                      alt="PDF icon"
                      className="w-6 h-6"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800 dark:text-green-300 truncate">{fileName}</p>
                    <p className="text-xs text-green-600 dark:text-green-400">File loaded successfully</p>
                  </div>
                  <button
                    onClick={() => {
                      setFileName('');
                      setResume('');
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
              
              {extracting && (
                <div className="mt-4 flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <svg className="animate-spin h-5 w-5 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Extracting text from file...</span>
                </div>
              )}
            </div>
            )}
            {inputMode === 'paste' && (
            <div>
              <label htmlFor="resume-text" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                Paste Resume Text
              </label>
              <div className="relative group">
                <textarea
                  id="resume-text"
                  value={resume}
                  onChange={(e) => {
                    setResume(e.target.value);
                    setFileName('');
                  }}
                  placeholder="Paste the candidate's resume text here...&#10;&#10;The AI will analyze the resume and generate tailored interview questions covering technical skills, projects, experience, behavioral aspects, and problem-solving abilities."
                  className="w-full h-48 sm:h-56 p-4 border-2 border-gray-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-white resize-none transition-all duration-300 text-sm sm:text-base leading-relaxed placeholder:text-gray-400 dark:placeholder:text-gray-500 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg focus:shadow-xl focus:shadow-blue-500/20"
                  disabled={loading || extracting}
                />
                <div className="absolute inset-0 rounded-2xl opacity-0 focus-within:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 blur-xl -z-10"></div>
              </div>
            </div>
            )}
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {resume && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{resume.length.toLocaleString()} characters</span>
              </div>
            )}
            <button
              onClick={generateQuestions}
              disabled={loading || extracting || !resume.trim()}
              className="relative w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-2xl hover:shadow-blue-500/50 disabled:transform-none flex items-center justify-center gap-2 text-sm sm:text-base overflow-hidden group"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer pointer-events-none"></div>
              <span className="relative z-10 flex items-center gap-2">
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Generating Questions...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Generate Questions</span>
                  </>
                )}
              </span>
            </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 rounded-xl shadow-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-red-800 dark:text-red-300">Error</p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
