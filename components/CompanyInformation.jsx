'use client';

import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../lib/colors';
import { FileText, PieChart, TrendingUp, Download, Eye, File, Folder, FolderOpen, ArrowLeft, X } from 'lucide-react';

export default function CompanyInformation({ company }) {
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  const categories = [
    { id: 'financieros', label: 'Estados Financieros', icon: PieChart, color: '#3b82f6', bgColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff' },
    { id: 'impuestos', label: 'Declaración de Impuestos', icon: TrendingUp, color: '#eab308', bgColor: isDark ? 'rgba(234, 179, 8, 0.1)' : '#fefce8' },
    { id: 'informes', label: 'Informes Analíticos', icon: FileText, color: '#8b5cf6', bgColor: isDark ? 'rgba(139, 92, 246, 0.1)' : '#f5f3ff' }
  ];

  const getFilesForCategory = (categoryId) => {
    const urlKey = `${categoryId}_url`;
    const url = company?.[urlKey];
    
    if (!url) return [];
    
    const urlParts = url.split('/');
    const rawFileName = urlParts[urlParts.length - 1] || 'documento';
    let cleanFileName = rawFileName.split('?')[0];
    cleanFileName = decodeURIComponent(cleanFileName);
    const ext = cleanFileName.split('.').pop()?.toLowerCase();
    
    const displayTitle = cleanFileName.replace(/-\d{13}\.[^.]+$/, '').replace(/_/g, ' ');
    
    return [
      { 
        id: categoryId, 
        name: displayTitle, 
        url: url,
        type: ext
      }
    ];
  };

  const [activeCategory, setActiveCategory] = useState(null);
  const [viewingFile, setViewingFile] = useState(null);

  const getFileIcon = (type, categoryColor) => {
    let iconColor = categoryColor;
    if (type === 'pdf') iconColor = '#ef4444'; // red-500
    else if (type === 'xlsx' || type === 'xls') iconColor = '#10b981'; // emerald-500
    else if (type === 'doc' || type === 'docx') iconColor = '#2563eb'; // blue-600

    switch(type) {
      case 'pdf': return <FileText color={iconColor} size={24} />;
      case 'xlsx':
      case 'xls': return <File color={iconColor} size={24} />;
      default: return <File color={iconColor} size={24} />;
    }
  };

  const renderCategorySelection = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
      {categories.map((cat) => {
        const Icon = cat.icon;
        const fileCount = company?.[`${cat.id}_url`] ? 1 : 0;
        
        return (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className="group relative overflow-hidden rounded-2xl p-6 transition-all duration-500 hover:-translate-y-1 text-left"
            style={{ 
              background: theme.surface, 
              border: `1px solid ${theme.border}`,
              boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.05)'
            }}
          >
            
            <div className="relative z-10 flex flex-col h-full">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 shadow-sm"
                style={{ background: cat.bgColor, color: cat.color }}
              >
                <Icon size={28} />
              </div>
              
              <h3 className="text-2xl font-bold mb-2" style={{ color: theme.text }}>
                {cat.label}
              </h3>
              
              <p className="text-sm font-medium opacity-80" style={{ color: theme.textSecondary }}>
                {fileCount} {fileCount === 1 ? 'documento disponible' : 'documentos disponibles'}
              </p>
              
              <div className="mt-6 pt-4 border-t flex items-center justify-between transition-colors" style={{ borderColor: theme.border, color: cat.color }}>
                <span className="text-sm font-semibold">Ver documentos</span>
                <ArrowLeft className="w-5 h-5 transform rotate-180 transition-transform group-hover:translate-x-2" />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  const renderFileList = () => {
    const categoryInfo = categories.find(c => c.id === activeCategory);
    const files = getFilesForCategory(activeCategory);
    const Icon = categoryInfo.icon;

    return (
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveCategory(null)}
              className="p-2 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              style={{ color: theme.textSecondary }}
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: categoryInfo.bgColor, color: categoryInfo.color }}>
                  <Icon size={20} />
                </div>
                <h2 className="text-2xl font-bold" style={{ color: theme.text }}>
                  {categoryInfo.label}
                </h2>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map(file => (
            <div 
              key={file.id}
              className="group flex flex-col p-5 rounded-2xl border transition-all duration-300 hover:shadow-md"
              style={{ 
                background: theme.surface, 
                borderColor: theme.border,
                boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.1)' : '0 4px 12px rgba(0,0,0,0.02)'
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div 
                  className="p-3 rounded-xl shadow-sm border transition-colors"
                  style={{ 
                    background: categoryInfo.bgColor, 
                    borderColor: `${categoryInfo.color}33` 
                  }}
                >
                  {getFileIcon(file.type, categoryInfo.color)}
                </div>
              </div>
              
              <div className="flex-1 mb-4">
                <h4 className="font-bold text-base line-clamp-2 leading-tight mb-2" style={{ color: theme.primary }} title={file.name}>
                  {file.name}
                </h4>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-auto">
                <button 
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5 border"
                  style={{ borderColor: theme.border, color: theme.text }}
                  onClick={() => setViewingFile(file)}
                >
                  <Eye size={16} /> Ver
                </button>
                <button 
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 shadow-sm"
                  style={{ background: categoryInfo.color }}
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = file.url;
                    link.download = file.name;
                    link.target = '_blank';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <Download size={16} /> Descargar
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {files.length === 0 && (
          <div className="py-16 text-center flex flex-col items-center justify-center rounded-2xl border border-dashed" style={{ borderColor: theme.border, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
            <FolderOpen size={48} style={{ color: theme.textSecondary }} className="mb-4 opacity-50" />
            <h3 className="text-xl font-bold mb-2" style={{ color: theme.text }}>No hay documentos</h3>
            <p style={{ color: theme.textSecondary }}>No se han subido documentos a esta categoría todavía.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      {!activeCategory && (
        <div className="p-8 rounded-2xl shadow-sm border relative overflow-hidden animate-fade-in" style={{ borderColor: theme.border, background: theme.surface }}>
          {/* Abstract background design */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-32 w-48 h-48 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 transform translate-x-1/2 translate-y-1/2"></div>
          
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2 tracking-tight" style={{ color: theme.text }}>
              Bienvenido, <span style={{ color: '#3b82f6' }}>{company?.name || 'Cliente'}</span>
            </h1>
            <p className="text-lg max-w-2xl" style={{ color: theme.textSecondary }}>
              Accede a todos los documentos importantes de tu empresa. Selecciona una categoría para ver y descargar los archivos.
            </p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {activeCategory ? renderFileList() : renderCategorySelection()}

      {/* File Viewer Modal */}
      {viewingFile && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setViewingFile(null)}
        >
          <div 
            className="w-full max-w-5xl h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border"
            style={{ background: theme.surface, borderColor: theme.border }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: theme.border }}>
              <h3 className="font-bold text-lg" style={{ color: theme.text }}>{viewingFile.name}</h3>
              <button 
                onClick={() => setViewingFile(null)}
                className="p-2 rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                style={{ color: theme.textSecondary }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900">
              {viewingFile.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <div className="w-full h-full flex items-center justify-center p-4">
                  <img src={viewingFile.url} alt={viewingFile.name} className="max-w-full max-h-full object-contain" />
                </div>
              ) : viewingFile.url.match(/\.pdf$/i) ? (
                <iframe src={viewingFile.url} className="w-full h-full border-0" title="Vista Previa PDF" />
              ) : viewingFile.url.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i) ? (
                <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewingFile.url)}`} className="w-full h-full border-0 bg-white" title="Vista Previa Documento" />
              ) : (
                <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewingFile.url)}&embedded=true`} className="w-full h-full border-0 bg-white" title="Vista Previa Documento" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
