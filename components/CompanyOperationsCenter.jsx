"use client";

import React from "react";
import {
  ChevronLeft,
  Folder,
  FileText,
  Shield,
  Briefcase,
  Calculator,
  Users,
  Landmark,
  Building2,
  LayoutTemplate,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  X,
  Plus,
  Edit2,
  Trash2,
  Search,
  ChevronRight,
  FolderOpen,
  Calendar,
  Clock,
  Lock,
  CheckCircle,
  PlusCircle,
  Maximize2,
  MoreVertical,
  FileBarChart,
  CreditCard,
  PlayCircle,
  Building,
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { supabase } from "../lib/supabase";
import { uploadFile } from "../lib/auth";
import { resolvePlatformsForCompany } from "../lib/platforms/registry";
import { checkCompanyCredentialsPublicAction } from "../lib/actions";
import Toast from "./Toast";
import CustomDatePicker from "./CustomDatePicker";

// Platform icons mapping (consistent with CompanyManager)
const PLATFORM_ICON_MAP = {
  FileText,
  Shield,
  Landmark,
  Briefcase,
  Calculator,
};

export default function CompanyOperationsCenter({
  company,
  onBack,
  theme,
  isDark,
  userPermissions = {},
  onPlatformAccess,
  onOpenArchivos,
  platformAccessLoading,
  readOnly = false,
}) {
  const [activities, setActivities] = React.useState([]);
  const [loadingActivities, setLoadingActivities] = React.useState(true);
  const [crmData, setCrmData] = React.useState({
    contact_name: company.contact_name || "",
    contact_email: company.contact_email || "",
    contact_phone: company.contact_phone || "",
    crm_notes: company.crm_notes || "",
  });
  const [savingCrm, setSavingCrm] = React.useState(false);
  const [toastMsg, setToastMsg] = React.useState(null);

  // Custom Tax Obligations
  const [customTaxObligations, setCustomTaxObligations] = React.useState([]);
  const [showTaxForm, setShowTaxForm] = React.useState(false);
  const [newTax, setNewTax] = React.useState({
    title: "",
    due_date: "",
    status: "Pronto",
  });
  const [savingTax, setSavingTax] = React.useState(false);
  const [showAllObligations, setShowAllObligations] = React.useState(false);

  // Photos
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  const galleryFileInputRef = React.useRef(null);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = React.useState(0);

  // Platform credentials status
  const [platformStatus, setPlatformStatus] = React.useState({});

  const photos = React.useMemo(() => {
    const list = [];
    if (company?.interior_photo_url) list.push(company.interior_photo_url);
    if (company?.exterior_photo_url) list.push(company.exterior_photo_url);
    if (Array.isArray(company?.gallery_urls)) {
      list.push(...company.gallery_urls);
    }
    return list;
  }, [
    company?.interior_photo_url,
    company?.exterior_photo_url,
    company?.gallery_urls,
  ]);


  React.useEffect(() => {
    if (!company?.id) return;

    async function fetchData() {
      setLoadingActivities(true);
      // Load credentials status
      const credRes = await checkCompanyCredentialsPublicAction(company.id);
      if (credRes?.success) {
        setPlatformStatus(credRes.status || {});
      }

      const { data, error } = await supabase
        .from("work_records")
        .select(
          "id, start_datetime, end_datetime, description, hours_worked, workers ( full_name )",
        )
        .eq("company_id", company.id)
        .order("start_datetime", { ascending: false })
        .limit(5);

      if (!error && data) {
        setActivities(data);
      }
      setLoadingActivities(false);

      const { data: taxData, error: taxError } = await supabase
        .from("company_tax_obligations")
        .select("*")
        .eq("company_id", company.id)
        .order("due_date", { ascending: true });

      if (!taxError && taxData) {
        setCustomTaxObligations(taxData);
      }
    }

    fetchData();

    // Initialize CRM data
    setCrmData({
      contact_name: company.contact_name || "",
      contact_email: company.contact_email || "",
      contact_phone: company.contact_phone || "",
      crm_notes: company.crm_notes || "",
    });
  }, [company]);

  const handleSaveCRM = async () => {
    setSavingCrm(true);
    const { error } = await supabase
      .from("companies")
      .update(crmData)
      .eq("id", company.id);

    setSavingCrm(false);
    if (error) {
      setToastMsg({ text: "Error al guardar CRM", type: "error" });
    } else {
      setToastMsg({ text: "Datos CRM actualizados", type: "success" });
      // Actualizar company prop if possible, pero al menos local state ya está.
    }
  };

  const handleSaveTax = async () => {
    if (!newTax.title || !newTax.due_date) {
      setToastMsg({ text: "Complete los campos obligatorios", type: "error" });
      return;
    }
    setSavingTax(true);
    const payload = {
      company_id: company.id,
      title: newTax.title,
      due_date: newTax.due_date,
      status: newTax.status,
    };
    const { data, error } = await supabase
      .from("company_tax_obligations")
      .insert([payload])
      .select()
      .single();

    setSavingTax(false);
    if (error) {
      setToastMsg({ text: "Error al guardar obligación", type: "error" });
    } else {
      setCustomTaxObligations([...customTaxObligations, data]);
      setShowTaxForm(false);
      setNewTax({ title: "", due_date: "", status: "Pronto" });
      setToastMsg({ text: "Obligación agregada", type: "success" });
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploadingPhoto(true);
    const newUrls = [];

    for (const file of files) {
      const result = await uploadFile(file, company.id);
      if (result.success) {
        newUrls.push(result.fileUrl);
      } else {
        setToastMsg({ text: result.error, type: "error" });
      }
    }

    if (newUrls.length > 0) {
      const currentGallery = Array.isArray(company.gallery_urls)
        ? company.gallery_urls
        : [];
      const updatedGallery = [...currentGallery, ...newUrls];
      const { error } = await supabase
        .from("companies")
        .update({ gallery_urls: updatedGallery })
        .eq("id", company.id);

      if (error) {
        console.error("Gallery update error:", error);
        setToastMsg({
            text: "Error al actualizar galería: " + error.message,
            type: "error",
        });
      } else {
        setToastMsg({ text: `Fotos añadidas correctamente`, type: "success" });
        if (onCompanyUpdated) {
            onCompanyUpdated();
        }
      }
    }
    setUploadingPhoto(false);
    if (galleryFileInputRef.current) galleryFileInputRef.current.value = "";
  };

  if (!company) return null;

  // Resolve platforms available for this company based on user permissions
  const companyPermisos = userPermissions[company.id] || [];
  const availablePlatforms = resolvePlatformsForCompany(
    companyPermisos,
    company.sistema_contable_slug,
  );

  const getPlatformBySlug = (slug) =>
    availablePlatforms.find((p) => p.slug === slug);
  const accountingPlatform = availablePlatforms.find(
    (p) => p.categoria === "contable",
  );

  // UI Configuration for actions
  const actionCards = [
    {
      id: "archivos",
      title: "Archivos",
      subtitle: "SharePoint / OneDrive",
      icon: Folder,
      color: "#3b82f6", // blue
      onClick: () => onOpenArchivos(company),
      loading: false,
    },
  ];

  const sriPlatform = getPlatformBySlug("sri");
  if (sriPlatform) {
    actionCards.push({
      id: "sri",
      title: sriPlatform.nombre,
      subtitle: "Portal de impuestos",
      icon: PLATFORM_ICON_MAP[sriPlatform.icono] || ExternalLink,
      color: sriPlatform.color,
      onClick: () => onPlatformAccess(company, sriPlatform.slug),
      loading: platformAccessLoading === `${company.id}-sri`,
    });
  }

  if (accountingPlatform) {
    actionCards.push({
      id: "contable",
      title: accountingPlatform.nombre,
      subtitle: "Sistema Contable",
      icon: PLATFORM_ICON_MAP[accountingPlatform.icono] || Calculator,
      color: accountingPlatform.color,
      onClick: () => onPlatformAccess(company, accountingPlatform.slug),
      loading: platformAccessLoading === `${company.id}-${accountingPlatform.slug}`,
    });
  }

  // Las siguientes plataformas se muestran siempre que se quiera, 
  // o se podrían restringir por permisos también.
  // Por ahora las dejamos visibles.
  actionCards.push({
    id: "supercias",
    title: "SuperCías",
    subtitle: "Portal corporativo",
    icon: Landmark,
    color: "#eab308", // Yellow for SuperCias
    onClick: () => window.open("https://www.supercias.gob.ec/portalscvs/index.htm", "_blank"),
    loading: false,
  });

  actionCards.push({
    id: "min_trabajo",
    title: "Ministerio de Trabajo",
    subtitle: "Trámites laborales",
    icon: Briefcase,
    color: "#f97316", // Orange for Min Trabajo
    onClick: () => window.open("https://sut.trabajo.gob.ec", "_blank"),
    loading: false,
  });

  actionCards.push({
    id: "iess",
    title: "IESS",
    subtitle: "Seguro Social",
    icon: Shield,
    color: "#10b981", // Green for IESS
    onClick: () => window.open("https://www.iess.gob.ec/empleadores/", "_blank"),
    loading: false,
  });

  // Power Automate Desktop Placeholder (Always visible)
  actionCards.push({
    id: "plantillas",
    title: "Plantillas y Flujos",
    subtitle: "Automatizaciones",
    icon: LayoutTemplate,
    color: "#8b5cf6", // purple
    onClick: () =>
      alert("El módulo de Plantillas y Automatizaciones está en preparación."),
    loading: false,
  });

  return (
    <div className="animate-fade-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header section */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-gray-700 dark:hover:text-white flex items-center justify-center shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-white/10 bg-white/50 dark:bg-black/20"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-4 flex-grow">
          <div
            className="w-32 h-32 rounded-3xl border-2 overflow-hidden shadow-md flex-shrink-0 bg-white"
            style={{ borderColor: theme.border }}
          >
            {company.logo_url || company.avatar_url ? (
              <img
                src={company.logo_url || company.avatar_url}
                className="w-full h-full object-contain p-2"
                alt={company.name}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                <Building2 size={64} />
              </div>
            )}
          </div>
          <div className="flex-grow">
            <h2
              className="text-2xl sm:text-3xl font-black tracking-tight"
              style={{ color: theme.text }}
            >
              {company.name}
            </h2>
            <div className="flex flex-wrap gap-2 mt-2">
              {company.ruc && (
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold border"
                  style={{
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "#ffffff",
                    borderColor: theme.border,
                    color: theme.text,
                  }}
                >
                  RUC: {company.ruc}
                </span>
              )}
              <span
                className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: isDark
                    ? "rgba(59, 130, 246, 0.15)"
                    : "#e0f2fe",
                  color: isDark ? "#60a5fa" : "#0369a1",
                  borderColor: isDark ? "rgba(59, 130, 246, 0.3)" : "#bae6fd",
                  borderWidth: "1px",
                }}
              >
                {company.type || "EMPRESA"}
              </span>
            </div>
          </div>
        </div>

        {/* Fotos de la empresa */}
        <div className="ml-auto hidden md:flex gap-3">
          <div className="flex gap-2">
            <input
              type="file"
              ref={galleryFileInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
            />

            {photos.length > 0 && (
              <div
                onClick={() => {
                  setCurrentPhotoIndex(0);
                  setLightboxOpen(true);
                }}
                className="w-24 h-24 rounded-2xl border flex items-center justify-center cursor-pointer transition-colors overflow-hidden relative group"
                style={{
                  borderColor: theme.border,
                  background: isDark ? "rgba(255,255,255,0.02)" : "#f9fafb",
                }}
              >
                <img
                  src={photos[0]}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  alt="Galería"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-bold px-2 py-1 bg-black/50 rounded-full">
                    Ver {photos.length}
                  </span>
                </div>
              </div>
            )}

            {!readOnly && (
              <div
                onClick={() => galleryFileInputRef.current?.click()}
                className="w-24 h-24 rounded-2xl border-2 border-dashed flex flex-col gap-1 items-center justify-center cursor-pointer transition-colors hover:border-gray-400 overflow-hidden relative"
                style={{
                  borderColor: theme.border,
                  background: isDark ? "rgba(255,255,255,0.02)" : "#f9fafb",
                }}
              >
              {uploadingPhoto ? (
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <div className="p-1.5 rounded-full bg-blue-500/10 text-blue-500">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </div>
                  <span
                    className="text-[10px] font-bold text-center mt-1"
                    style={{ color: theme.textSecondary }}
                  >
                    Añadir
                    <br />
                    Fotos
                  </span>
                </>
              )}
            </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Obligations & Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div
            className="rounded-2xl border shadow-sm p-5 transition-all"
            style={{ background: theme.surface, borderColor: theme.border }}
          >
            <h3
              className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2"
              style={{ color: theme.text }}
            >
              <AlertCircle size={16} className="text-amber-500" />
              Obligaciones Tributarias
            </h3>

            <div className="space-y-3">
              {(() => {
                const allObligations = [
                  ...customTaxObligations,
                ];
                const visibleObligations = showAllObligations
                  ? allObligations
                  : allObligations.slice(0, 3);

                if (allObligations.length === 0) {
                  return (
                    <div
                      className="p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-2"
                      style={{
                        borderColor: theme.border,
                        background: isDark
                          ? "rgba(255,255,255,0.03)"
                          : "#ffffff",
                      }}
                    >
                      <span className="text-sm text-gray-500">
                        No hay obligaciones registradas
                      </span>
                    </div>
                  );
                }

                return (
                  <>
                    {visibleObligations.map((ob) => (
                      <div
                        key={ob.id}
                        className="p-4 rounded-xl border flex flex-col gap-1 transition-all hover:shadow-sm"
                        style={{
                          borderColor: theme.border,
                          background: isDark
                            ? "rgba(255,255,255,0.03)"
                            : "#ffffff",
                        }}
                      >
                        <div className="flex flex-col">
                          <span
                            className="text-sm font-bold"
                            style={{ color: theme.text }}
                          >
                            {ob.title}
                          </span>
                          <span
                            className="text-xs font-medium mt-0.5"
                            style={{ color: theme.textSecondary }}
                          >
                            Vence el{" "}
                            {new Date(ob.due_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                    {allObligations.length > 3 && (
                      <button
                        onClick={() =>
                          setShowAllObligations(!showAllObligations)
                        }
                        className="w-full py-2 text-xs font-bold text-center transition-colors"
                        style={{ color: theme.primary }}
                      >
                        {showAllObligations
                          ? "Ocultar"
                          : `Ver más (${allObligations.length - 3})`}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>

            {!showTaxForm ? (
              !readOnly && (
                <button
                  onClick={() => setShowTaxForm(true)}
                  className="w-full mt-4 py-2.5 rounded-xl border border-dashed text-xs font-bold transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                  style={{
                    color: theme.textSecondary,
                    borderColor: theme.border,
                  }}
                >
                  + Agregar Obligación
                </button>
              )
            ) : (
              <div
                className="mt-4 p-4 rounded-xl border space-y-3"
                style={{
                  borderColor: theme.border,
                  background: isDark ? "rgba(0,0,0,0.2)" : "#f9fafb",
                }}
              >
                <input
                  type="text"
                  placeholder="Título (ej: Declaración SRI)"
                  value={newTax.title}
                  onChange={(e) =>
                    setNewTax({ ...newTax, title: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-blue-500 outline-none"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                    borderColor: theme.border,
                    color: theme.text,
                  }}
                />
                <div className="flex gap-2">
                  <CustomDatePicker
                    value={newTax.due_date}
                    onChange={(val) => setNewTax({ ...newTax, due_date: val })}
                    className="flex-1 px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-blue-500 outline-none"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                      borderColor: theme.border,
                      color: theme.text,
                    }}
                  />
                  <select
                    value={newTax.status}
                    onChange={(e) =>
                      setNewTax({ ...newTax, status: e.target.value })
                    }
                    className="px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-blue-500 outline-none"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                      borderColor: theme.border,
                      color: theme.text,
                    }}
                  >
                    <option value="Al día">Al día</option>
                    <option value="Pronto">Pronto</option>
                    <option value="Urgente">Urgente</option>
                    <option value="Atrasado">Atrasado</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowTaxForm(false)}
                    className="flex-1 py-2 rounded-lg text-xs font-bold border transition-colors hover:bg-gray-100 dark:hover:bg-white/10"
                    style={{ color: theme.text, borderColor: theme.border }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveTax}
                    disabled={savingTax}
                    className="flex-1 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
                  >
                    {savingTax ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Actions Grid */}
        <div className="lg:col-span-2">
          <div
            className="rounded-2xl border shadow-sm p-6"
            style={{ background: theme.surface, borderColor: theme.border }}
          >
            <h3
              className="text-sm font-black uppercase tracking-widest mb-5 flex items-center gap-2"
              style={{ color: theme.text }}
            >
              <LayoutTemplate size={16} className="text-blue-500" />
              Acciones Principales
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {actionCards.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={action.onClick}
                    disabled={action.loading}
                    className="group relative flex items-center p-4 rounded-xl border text-left transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none overflow-hidden"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.02)" : "#ffffff",
                      borderColor: theme.border,
                    }}
                  >
                    {/* Hover background effect */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                      style={{ backgroundColor: action.color }}
                    />

                    <div className="relative flex items-center gap-4 w-full z-10">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110"
                        style={{
                          backgroundColor: `${action.color}15`,
                          color: action.color,
                        }}
                      >
                        {action.loading ? (
                          <div
                            className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                            style={{
                              borderColor: action.color,
                              borderTopColor: "transparent",
                            }}
                          />
                        ) : (
                          <Icon size={24} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4
                          className="font-bold text-sm truncate"
                          style={{ color: theme.text }}
                        >
                          {action.title}
                        </h4>
                        <p
                          className="text-xs truncate font-medium mt-0.5"
                          style={{ color: theme.textSecondary }}
                        >
                          {action.loading
                            ? "Iniciando sesión segura..."
                            : action.subtitle}
                        </p>
                      </div>
                      <div
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -translate-x-2 group-hover:translate-x-0"
                        style={{ color: action.color }}
                      >
                        <ChevronLeft size={20} className="rotate-180" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CRM & History Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* CRM Panel */}
        <div
          className="rounded-2xl border shadow-sm p-6"
          style={{ background: theme.surface, borderColor: theme.border }}
        >
          <div className="flex justify-between items-center mb-5">
            <h3
              className="text-sm font-black uppercase tracking-widest flex items-center gap-2"
              style={{ color: theme.text }}
            >
              <Users size={16} className="text-blue-500" />
              Datos de Contacto y Notas
            </h3>
            {!readOnly && (
              <button
                onClick={handleSaveCRM}
                disabled={savingCrm}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {savingCrm ? "Guardando..." : "Guardar Datos"}
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-xs font-bold mb-1"
                  style={{ color: theme.textSecondary }}
                >
                  Contacto Principal
                </label>
                <input
                  type="text"
                  value={crmData.contact_name}
                  onChange={(e) =>
                    setCrmData({ ...crmData, contact_name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-blue-500 outline-none"
                  style={{
                    background: isDark ? "rgba(0,0,0,0.2)" : "#f9fafb",
                    borderColor: theme.border,
                    color: theme.text,
                  }}
                  placeholder="Nombre del contacto..."
                  disabled={readOnly}
                />
              </div>
              <div>
                <label
                  className="block text-xs font-bold mb-1"
                  style={{ color: theme.textSecondary }}
                >
                  Teléfono
                </label>
                <input
                  type="text"
                  value={crmData.contact_phone}
                  onChange={(e) =>
                    setCrmData({ ...crmData, contact_phone: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-blue-500 outline-none"
                  style={{
                    background: isDark ? "rgba(0,0,0,0.2)" : "#f9fafb",
                    borderColor: theme.border,
                    color: theme.text,
                  }}
                  placeholder="0999999999"
                  disabled={readOnly}
                />
              </div>
            </div>
            <div>
              <label
                className="block text-xs font-bold mb-1"
                style={{ color: theme.textSecondary }}
              >
                Correo Electrónico
              </label>
              <input
                type="email"
                value={crmData.contact_email}
                onChange={(e) =>
                  setCrmData({ ...crmData, contact_email: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-blue-500 outline-none"
                style={{
                  background: isDark ? "rgba(0,0,0,0.2)" : "#f9fafb",
                  borderColor: theme.border,
                  color: theme.text,
                }}
                placeholder="correo@empresa.com"
                disabled={readOnly}
              />
            </div>
            <div>
              <label
                className="block text-xs font-bold mb-1"
                style={{ color: theme.textSecondary }}
              >
                Notas de Gestión
              </label>
              <textarea
                value={crmData.crm_notes}
                onChange={(e) =>
                  setCrmData({ ...crmData, crm_notes: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                style={{
                  background: isDark ? "rgba(0,0,0,0.2)" : "#f9fafb",
                  borderColor: theme.border,
                  color: theme.text,
                }}
                placeholder="Apuntes importantes, horario de atención, requerimientos especiales..."
                disabled={readOnly}
              />
            </div>
          </div>
        </div>

        {/* Historial Panel */}
        <div
          className="rounded-2xl border shadow-sm p-6"
          style={{ background: theme.surface, borderColor: theme.border }}
        >
          <div className="flex justify-between items-center mb-5">
            <h3
              className="text-sm font-black uppercase tracking-widest flex items-center gap-2"
              style={{ color: theme.text }}
            >
              <FileText size={16} className="text-emerald-500" />
              Historial Reciente
            </h3>
          </div>

          {loadingActivities ? (
            <div className="flex items-center justify-center p-8">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-xl border"
                  style={{
                    borderColor: theme.border,
                    background: isDark ? "rgba(255,255,255,0.02)" : "#f9fafb",
                  }}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className="text-xs font-bold"
                      style={{ color: theme.primary }}
                    >
                      {act.workers?.full_name || "Desconocido"}
                    </span>
                    <span
                      className="text-[10px]"
                      style={{ color: theme.textSecondary }}
                    >
                      {new Date(act.start_datetime).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm mb-2" style={{ color: theme.text }}>
                    {act.description}
                  </p>
                  <div className="flex gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                      {act.hours_worked} horas
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="text-center p-8 border border-dashed rounded-xl"
              style={{ borderColor: theme.border }}
            >
              <FileText
                size={24}
                className="mx-auto mb-2 opacity-20"
                style={{ color: theme.text }}
              />
              <p
                className="text-sm font-medium"
                style={{ color: theme.textSecondary }}
              >
                No hay actividades registradas
              </p>
            </div>
          )}
        </div>
      </div>

      {toastMsg && (
        <Toast
          message={toastMsg.text}
          type={toastMsg.type}
          onClose={() => setToastMsg(null)}
        />
      )}
      {/* Lightbox Modal */}
      {lightboxOpen && photos.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X size={24} />
          </button>

          {photos.length > 1 && (
            <button
              onClick={() =>
                setCurrentPhotoIndex((prev) =>
                  prev === 0 ? photos.length - 1 : prev - 1,
                )
              }
              className="absolute left-6 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          <img
            src={photos[currentPhotoIndex]}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
            alt={`Foto ${currentPhotoIndex + 1}`}
          />

          {photos.length > 1 && (
            <button
              onClick={() =>
                setCurrentPhotoIndex((prev) =>
                  prev === photos.length - 1 ? 0 : prev + 1,
                )
              }
              className="absolute right-6 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          )}

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 text-white text-sm font-medium">
            {currentPhotoIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </div>
  );
}
