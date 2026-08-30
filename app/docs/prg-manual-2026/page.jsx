'use client';

import { useState, useEffect } from 'react';

const ChevronDown = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
);
const ChevronRight = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);
const SearchIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);
const MenuIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
);
const XIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

const sections = [
  { id: 'inicio', title: '🏠 Inicio' },
  { id: 'roles', title: '👥 Roles y Accesos' },
  { id: 'admin', title: '🛡️ Panel de Administración' },
  { id: 'trabajadores', title: '👷 Portal del Funcionario' },
  { id: 'empresa', title: '🏢 Portal de Empresa' },
  { id: 'clientes', title: '📊 Portal de Clientes' },
  { id: 'archivos', title: '📁 Archivos y SharePoint' },
  { id: 'reportes', title: '📈 Reportes Automáticos' },
  { id: 'cursos', title: '🎓 Cursos' },
  { id: 'entrevistas', title: '📝 Entrevistas / Reclutamiento' },
  { id: 'errores', title: '⚠️ Errores Comunes' },
  { id: 'faq', title: '❓ Preguntas Frecuentes' },
];

const faqItems = [
  { q: '¿Puedo acceder desde mi celular?', a: 'Sí, el sistema es completamente responsivo. Puedes acceder desde cualquier dispositivo con navegador web.' },
  { q: '¿Las contraseñas se encriptan?', a: 'Sí, todas las contraseñas se almacenan encriptadas con bcrypt en la base de datos.' },
  { q: '¿Se puede exportar la información?', a: 'Sí. Desde el panel de administración y el portal de clientes puedes exportar a Excel (.xlsx) con formato profesional.' },
  { q: '¿Cómo funciona el monitoreo automático?', a: 'Un proceso automatizado (GitHub Actions) escanea los archivos de SharePoint cada 5 minutos usando Microsoft Graph API. Detecta creaciones, modificaciones y eliminaciones de archivos y los registra en la base de datos.' },
  { q: '¿Qué ocurre si se cae la conexión a internet?', a: 'Los datos ya almacenados permanecen seguros en Supabase (nube). Cuando se restablezca la conexión, el sistema retomará el monitoreo automáticamente.' },
  { q: '¿Puedo cambiar mi contraseña?', a: 'Los administradores pueden cambiar su propia contraseña desde el ícono de perfil en la esquina superior derecha del panel. Las contraseñas de funcionarios se cambian desde la sección "Funcionarios" del panel de admin.' },
  { q: '¿Cuánto tiempo duran las sesiones?', a: 'Administrador: 2 horas. Funcionario: 10 minutos. Empresa: 1 hora. Después se redirige automáticamente al login.' },
  { q: '¿Cómo se asignan cursos a empresas?', a: 'Desde el panel de administración > Cursos, al crear o editar un curso puedes seleccionar a cuáles empresas se les asignará. Solo las empresas asignadas verán ese curso en su portal.' },
];

function Collapsible({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 12, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px',
          background: open ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)',
          border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: 15, fontWeight: 600, textAlign: 'left',
          transition: 'background 0.2s'
        }}
      >
        {open
          ? <ChevronDown className="doc-icon" style={{ width: 18, height: 18, flexShrink: 0 }} />
          : <ChevronRight className="doc-icon" style={{ width: 18, height: 18, flexShrink: 0 }} />
        }
        {title}
      </button>
      {open && (
        <div style={{ padding: '12px 18px 18px', borderTop: '1px solid rgba(255,255,255,0.06)', animation: 'docFadeIn 0.25s ease' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function StepList({ steps }) {
  return (
    <ol style={{ paddingLeft: 0, listStyle: 'none', margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {steps.map((step, i) => (
        <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff',
            fontSize: 13, fontWeight: 700
          }}>{i + 1}</span>
          <span style={{ color: '#cbd5e1', lineHeight: 1.6, paddingTop: 3 }}>{step}</span>
        </li>
      ))}
    </ol>
  );
}

function InfoCard({ emoji, title, children, color = '#3b82f6' }) {
  return (
    <div style={{
      border: `1px solid ${color}30`, borderRadius: 12, padding: '16px 20px',
      background: `${color}08`, marginBottom: 12
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{emoji}</span>
        <strong style={{ color, fontSize: 15 }}>{title}</strong>
      </div>
      <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

function WarningCard({ children }) {
  return (
    <div style={{
      border: '1px solid rgba(251,191,36,0.3)', borderRadius: 12, padding: '14px 18px',
      background: 'rgba(251,191,36,0.06)', marginBottom: 14, display: 'flex', gap: 10, alignItems: 'flex-start'
    }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
      <span style={{ color: '#fbbf24', fontSize: 14, lineHeight: 1.6 }}>{children}</span>
    </div>
  );
}

function Kbd({ children }) {
  return (
    <code style={{
      background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', padding: '2px 8px',
      borderRadius: 6, fontSize: 13, fontFamily: 'monospace', border: '1px solid rgba(99,102,241,0.2)'
    }}>{children}</code>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('inicio');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Scroll spy
  useEffect(() => {
    const handleScroll = () => {
      const offsets = sections.map(s => {
        const el = document.getElementById(s.id);
        return el ? { id: s.id, top: el.getBoundingClientRect().top } : null;
      }).filter(Boolean);

      const current = offsets.reduce((best, cur) =>
        cur.top <= 120 && cur.top > (best?.top ?? -Infinity) ? cur : best
      , null);

      if (current) setActiveSection(current.id);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileNavOpen(false);
  };

  const filteredFaq = faqItems.filter(f =>
    !searchQuery ||
    f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <head>
        <title>Documentación — PRG Auditores</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Manual de usuario interno del sistema PRG Auditores" />
      </head>

      {}
      <style>{`
        * { box-sizing: border-box; margin: 0; }
        @keyframes docFadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .doc-icon { width: 18px; height: 18px; }
        .doc-page { display: flex; min-height: 100vh; background: #0a0e17; color: #e2e8f0; font-family: 'Inter', -apple-system, sans-serif; }
        .doc-sidebar {
          position: fixed; top: 0; left: 0; bottom: 0; width: 280px; z-index: 40;
          background: #0d1117; border-right: 1px solid rgba(255,255,255,0.06);
          display: flex; flex-direction: column; overflow-y: auto;
        }
        .doc-sidebar-brand { padding: 28px 24px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .doc-sidebar-brand h2 { font-size: 18px; font-weight: 800; background: linear-gradient(135deg, #3b82f6, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; }
        .doc-sidebar-brand p { font-size: 12px; color: #64748b; margin-top: 4px; }
        .doc-sidebar-nav { flex: 1; padding: 12px; }
        .doc-nav-item {
          width: 100%; display: flex; align-items: center; gap: 6px; padding: 10px 14px; border: none; border-radius: 10px;
          font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s;
          background: transparent; color: #94a3b8; text-align: left; margin-bottom: 2px;
        }
        .doc-nav-item:hover { background: rgba(255,255,255,0.04); color: #e2e8f0; }
        .doc-nav-item.active { background: rgba(59,130,246,0.12); color: #60a5fa; font-weight: 600; }
        .doc-main { flex: 1; margin-left: 280px; padding: 40px 48px 80px; max-width: 900px; }
        .doc-mobile-header {
          display: none; position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          background: #0d1117; border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 12px 16px; align-items: center; justify-content: space-between;
        }
        .doc-mobile-overlay { display: none; position: fixed; inset: 0; z-index: 45; background: rgba(0,0,0,0.6); }

        .doc-section { margin-bottom: 56px; scroll-margin-top: 80px; animation: docFadeIn 0.4s ease; }
        .doc-h1 { font-size: 32px; font-weight: 800; margin-bottom: 8px; background: linear-gradient(135deg, #3b82f6, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .doc-h2 { font-size: 24px; font-weight: 700; margin-bottom: 16px; color: #f1f5f9; display: flex; align-items: center; gap: 10px; }
        .doc-h3 { font-size: 18px; font-weight: 600; margin-bottom: 10px; color: #cbd5e1; }
        .doc-p { color: #94a3b8; line-height: 1.8; margin-bottom: 16px; font-size: 15px; }
        .doc-divider { border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 32px 0; }

        .doc-table { width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 16px; border-radius: 10px; overflow: hidden; }
        .doc-table th { background: rgba(59,130,246,0.12); color: #60a5fa; padding: 12px 16px; text-align: left; font-weight: 600; }
        .doc-table td { padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #cbd5e1; }
        .doc-table tr:hover td { background: rgba(255,255,255,0.02); }

        .doc-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .doc-badge-admin { background: rgba(239,68,68,0.15); color: #f87171; }
        .doc-badge-worker { background: rgba(34,197,94,0.15); color: #4ade80; }
        .doc-badge-company { background: rgba(59,130,246,0.15); color: #60a5fa; }

        .doc-search { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); margin-bottom: 20px; }
        .doc-search input { flex: 1; border: none; background: none; color: #e2e8f0; font-size: 14px; outline: none; }
        .doc-search input::placeholder { color: #475569; }

        .doc-footer { margin-top: 60px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center; color: #475569; font-size: 13px; }

        @media (max-width: 900px) {
          .doc-sidebar { transform: translateX(-100%); transition: transform 0.3s; }
          .doc-sidebar.open { transform: translateX(0); }
          .doc-main { margin-left: 0; padding: 80px 20px 60px; }
          .doc-mobile-header { display: flex; }
          .doc-mobile-overlay.open { display: block; }
        }
      `}</style>

      <div className="doc-page">
        {}
        <div className="doc-mobile-header">
          <button onClick={() => setMobileNavOpen(!mobileNavOpen)} style={{ background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', padding: 4 }}>
            {mobileNavOpen ? <XIcon className="doc-icon" style={{ width: 24, height: 24 }} /> : <MenuIcon className="doc-icon" style={{ width: 24, height: 24 }} />}
          </button>
          <span style={{ fontWeight: 700, fontSize: 15, background: 'linear-gradient(135deg,#3b82f6,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PRG Docs</span>
          <div style={{ width: 28 }} />
        </div>

        {}
        <div className={`doc-mobile-overlay ${mobileNavOpen ? 'open' : ''}`} onClick={() => setMobileNavOpen(false)} />

        {}
        <aside className={`doc-sidebar ${mobileNavOpen ? 'open' : ''}`}>
          <div className="doc-sidebar-brand">
            <h2>PRG Auditores</h2>
            <p>Documentación del Sistema v1.0</p>
          </div>
          <nav className="doc-sidebar-nav">
            {sections.map(s => (
              <button
                key={s.id}
                className={`doc-nav-item ${activeSection === s.id ? 'active' : ''}`}
                onClick={() => scrollTo(s.id)}
              >
                {s.title}
              </button>
            ))}
          </nav>
          <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', color: '#475569', fontSize: 12 }}>
            Última actualización: Abril 2026
          </div>
        </aside>

        {}
        <main className="doc-main">

          {}
          <section id="inicio" className="doc-section">
            <h1 className="doc-h1">Manual de Usuario — Sistema PRG</h1>
            <p className="doc-p">
              Bienvenido a la documentación oficial del <strong style={{ color: '#e2e8f0' }}>Sistema de Registro de Trabajo de PRG Auditores</strong>.
              Este manual cubre todas las funcionalidades del sistema, cómo usarlo correctamente, y qué hacer en caso de problemas.
            </p>
            <InfoCard emoji="🌐" title="¿Qué es este sistema?" color="#3b82f6">
              Es una plataforma web para gestionar las actividades diarias de los funcionarios de PRG Auditores.
              Permite registrar horas trabajadas, controlar asistencia, monitorear archivos de SharePoint en tiempo real,
              gestionar empresas/clientes, asignar cursos y realizar entrevistas de reclutamiento. Todo desde un solo lugar.
            </InfoCard>
            <InfoCard emoji="🔗" title="Acceso al sistema" color="#8b5cf6">
              <span>Para ingresar al sistema, abra su navegador y visite la URL proporcionada por su administrador.
              Necesitará un <strong>usuario</strong> y <strong>contraseña</strong> que le serán asignados.</span>
            </InfoCard>
          </section>

          {}
          <section id="roles" className="doc-section">
            <h2 className="doc-h2">👥 Roles y Accesos</h2>
            <p className="doc-p">El sistema maneja 3 tipos de usuarios. Cada uno tiene acceso a módulos diferentes según su rol:</p>

            <table className="doc-table">
              <thead>
                <tr>
                  <th>Rol</th>
                  <th>Acceso</th>
                  <th>Duración Sesión</th>
                  <th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="doc-badge doc-badge-admin">Administrador</span></td>
                  <td><Kbd>/administracion</Kbd></td>
                  <td>2 horas</td>
                  <td>Acceso total: dashboards, reportes, funcionarios, empresas, archivos, cursos, entrevistas.</td>
                </tr>
                <tr>
                  <td><span className="doc-badge doc-badge-worker">Funcionario</span></td>
                  <td><Kbd>/trabajadores</Kbd></td>
                  <td>10 minutos</td>
                  <td>Registrar asistencia, ver sus actividades, acceder a archivos OneDrive.</td>
                </tr>
                <tr>
                  <td><span className="doc-badge doc-badge-company">Empresa</span></td>
                  <td><Kbd>/empresa</Kbd></td>
                  <td>1 hora</td>
                  <td>Ver los cursos/capacitaciones asignadas por el administrador.</td>
                </tr>
              </tbody>
            </table>

            <WarningCard>
              Todos los usuarios inician sesión desde la <strong>misma página de login</strong> (<Kbd>/</Kbd>). El sistema detecta automáticamente el tipo de usuario y lo redirige al portal correspondiente.
            </WarningCard>

            <Collapsible title="¿Cómo iniciar sesión?">
              <StepList steps={[
                'Ingrese a la URL del sistema en su navegador.',
                'Escriba su nombre de usuario en el campo "Usuario".',
                'Escriba su contraseña en el campo "Contraseña".',
                'Haga clic en "Ingresar". El sistema lo redirigirá automáticamente según su rol.',
              ]} />
            </Collapsible>
          </section>

          {}
          <section id="admin" className="doc-section">
            <h2 className="doc-h2">🛡️ Panel de Administración</h2>
            <p className="doc-p">El panel de administración es el corazón del sistema. Desde aquí se controla todo.</p>

            <h3 className="doc-h3">Módulos disponibles</h3>
            <table className="doc-table">
              <thead>
                <tr><th>Módulo</th><th>Descripción</th></tr>
              </thead>
              <tbody>
                <tr><td>📊 Dashboards</td><td>Gráficos de productividad por empresa, por funcionario, horas por día, distribución del tiempo. Estadísticas en tiempo real.</td></tr>
                <tr><td>📅 Reportes</td><td>Monitor de archivos en tiempo real. Muestra los archivos detectados automáticamente desde SharePoint (creados, modificados, eliminados).</td></tr>
                <tr><td>👥 Funcionarios</td><td>Crear, editar y eliminar funcionarios. Gestionar credenciales de acceso.</td></tr>
                <tr><td>🏢 Empresas</td><td>Gestión completa de empresas: crear, editar, eliminar, asignar logos, credenciales de acceso y agrupar empresas.</td></tr>
                <tr><td>📁 Archivos</td><td>Explorador de archivos conectado a SharePoint / OneDrive vía autenticación de Microsoft (MSAL).</td></tr>
                <tr><td>🎓 Cursos</td><td>Crear presentaciones/cursos en formato de diapositivas y asignarlos a empresas específicas.</td></tr>
                <tr><td>📝 Entrevistas</td><td>Crear encuestas de reclutamiento, definir preguntas, generar enlaces públicos y revisar respuestas de candidatos.</td></tr>
              </tbody>
            </table>

            <Collapsible title="📊 Dashboard — Cómo interpretar los gráficos" defaultOpen>
              <p className="doc-p">El dashboard muestra 4 gráficos principales:</p>
              <StepList steps={[
                <span key="1"><strong>Horas por Empresa (Barras):</strong> Muestra las horas totales reportadas por cada empresa. Útil para ver dónde se concentra el esfuerzo del equipo.</span>,
                <span key="2"><strong>Distribución del Tiempo (Circular):</strong> Muestra proporcionalmente cómo se divide el tiempo entre las 5 empresas principales.</span>,
                <span key="3"><strong>Horas por Día (Líneas):</strong> Evolución temporal de las horas trabajadas en los últimos 30 días.</span>,
                <span key="4"><strong>Productividad por Funcionario (Barras):</strong> Ranking de horas totales por cada miembro del equipo.</span>,
              ]} />
              <InfoCard emoji="🔄" title="Actualización automática" color="#10b981">
                Las estadísticas se actualizan automáticamente cada 60 segundos sin necesidad de recargar la página.
              </InfoCard>
            </Collapsible>

            <Collapsible title="👥 Cómo crear un nuevo Funcionario">
              <StepList steps={[
                'Ir a la pestaña "Funcionarios" en el sidebar.',
                'Clic en el botón "+ Nuevo Funcionario".',
                'Llenar: Nombre de usuario, Nombre completo, Contraseña, y opcionalmente Email.',
                'Clic en "Guardar". El funcionario podrá iniciar sesión inmediatamente.',
              ]} />
              <WarningCard>Los nombres de usuario deben ser únicos. Si el sistema muestra un error de duplicado, use un nombre diferente.</WarningCard>
            </Collapsible>

            <Collapsible title="🏢 Cómo crear una nueva Empresa">
              <StepList steps={[
                'Ir a la pestaña "Empresas" en el sidebar.',
                'Clic en "+ Nueva Empresa".',
                'Llenar: Nombre de la empresa, Tipo (Auditoría o Contabilidad).',
                'Opcionalmente: asignar un grupo, logo, y credenciales de acceso.',
                'Clic en "Guardar".',
              ]} />
            </Collapsible>

            <Collapsible title="📈 Cómo generar un reporte manual">
              <StepList steps={[
                'Ve al módulo de Reportes (pestaña "Reportes").',
                'Verás el monitor de archivos en tiempo real con las últimas detecciones automáticas de SharePoint.',
                'Puedes filtrar por empresa, por trabajador, y por rango de fechas.',
                'Clic en "Exportar a Excel" para descargar un informe en formato .xlsx.',
              ]} />
            </Collapsible>

            <Collapsible title="🔧 Cambiar tu contraseña de Admin">
              <StepList steps={[
                'Haz clic en tu nombre/avatar en la esquina superior derecha del panel.',
                'Se abrirá un modal de perfil.',
                'Escribe la nueva contraseña (mínimo 4 caracteres) y confírmala.',
                'Clic en "Guardar cambios".',
              ]} />
            </Collapsible>
          </section>

          {}
          <section id="trabajadores" className="doc-section">
            <h2 className="doc-h2">👷 Portal del Funcionario</h2>
            <p className="doc-p">Los funcionarios tienen acceso a 3 módulos principales:</p>

            <Collapsible title="⏱️ Control de Asistencia" defaultOpen>
              <p className="doc-p">Este es el módulo principal. Permite registrar la hora de entrada y salida del funcionario.</p>
              <StepList steps={[
                'Al ingresar al portal, verás el botón verde "Iniciar Asistencia".',
                'Haz clic para marcar tu entrada. Aparecerá un cronómetro corriendo.',
                'Cuando termines tu jornada, haz clic en "Detener Asistencia" (botón rojo).',
                'El sistema registrará automáticamente las horas totales trabajadas.',
              ]} />
              <InfoCard emoji="📋" title="Historial" color="#10b981">
                Debajo del botón de asistencia aparecerán tus últimas 5 sesiones registradas con fecha, hora de entrada, hora de salida y total de horas.
              </InfoCard>
            </Collapsible>

            <Collapsible title="📃 Mis Actividades">
              <p className="doc-p">Muestra el historial completo de actividades registradas manualmente. Incluye empresa, fechas, duración y archivos adjuntos.</p>
              <p className="doc-p">Haz clic sobre cualquier fila para ver el detalle completo, incluyendo la vista previa del archivo adjunto.</p>
            </Collapsible>

            <Collapsible title="📂 Mis Archivos (OneDrive)">
              <p className="doc-p">Este módulo conecta directamente con OneDrive/SharePoint mediante autenticación de Microsoft.</p>
              <StepList steps={[
                'Haz clic en "Iniciar sesión con Microsoft" la primera vez.',
                'Se abrirá una ventana de Microsoft para autorizar el acceso.',
                'Una vez autenticado, podrás explorar carpetas y archivos directamente desde el sistema.',
              ]} />
              <WarningCard>Necesitas una cuenta de Microsoft 365 organizacional para usar esta función.</WarningCard>
            </Collapsible>
          </section>

          {}
          <section id="empresa" className="doc-section">
            <h2 className="doc-h2">🏢 Portal de Empresa</h2>
            <p className="doc-p">
              Las empresas que tengan credenciales asignadas pueden acceder a su portal para ver los <strong style={{ color: '#e2e8f0' }}>cursos y capacitaciones</strong> que el administrador les ha asignado.
            </p>

            <Collapsible title="¿Cómo acceder como Empresa?" defaultOpen>
              <StepList steps={[
                'Ingresa al sistema con las credenciales proporcionadas por el administrador.',
                'El sistema te redirigirá automáticamente al portal de empresa.',
                'Verás una lista de cursos asignados con su portada y descripción.',
                'Haz clic en cualquier curso para ver las diapositivas interactivas.',
              ]} />
            </Collapsible>

            <InfoCard emoji="🎨" title="Visor de Cursos" color="#a855f7">
              Las presentaciones/cursos se muestran en un visor interactivo con navegación por diapositivas, soporte de imágenes, y modo pantalla completa.
            </InfoCard>
          </section>

          {}
          <section id="clientes" className="doc-section">
            <h2 className="doc-h2">📊 Portal de Clientes</h2>
            <p className="doc-p">El portal de clientes está disponible en <Kbd>/clientes</Kbd> y permite a cualquier persona consultar las actividades realizadas para una empresa.</p>

            <Collapsible title="Cómo consultar actividades" defaultOpen>
              <StepList steps={[
                'Ingresa a la ruta /clientes en el navegador.',
                'Selecciona tu empresa del menú desplegable.',
                'Verás un resumen: total de actividades, horas totales y cantidad de funcionarios.',
                'Filtra por rango de fechas o por funcionario específico.',
                'Exporta los resultados a Excel si lo necesitas.',
              ]} />
            </Collapsible>
          </section>

          {}
          <section id="archivos" className="doc-section">
            <h2 className="doc-h2">📁 Archivos y SharePoint</h2>
            <p className="doc-p">El sistema tiene una integración profunda con Microsoft 365 (SharePoint / OneDrive) para monitorear y explorar archivos.</p>

            <Collapsible title="Explorador de Archivos" defaultOpen>
              <p className="doc-p">Disponible en el panel de Administración y en el portal del Funcionario. Permite navegar por las carpetas de OneDrive, ver archivos, y crear carpetas directamente desde el sistema.</p>
              <InfoCard emoji="🔑" title="Autenticación con Microsoft" color="#0078d4">
                Para usar el explorador de archivos, debes iniciar sesión con tu cuenta de Microsoft 365 organizacional.
                Haz clic en "Sign in with Microsoft" y sigue las instrucciones en pantalla.
              </InfoCard>
            </Collapsible>

            <Collapsible title="Monitor de Archivos en Tiempo Real">
              <p className="doc-p">El sistema detecta automáticamente cuando un archivo es <strong style={{ color: '#4ade80' }}>creado</strong>, <strong style={{ color: '#fbbf24' }}>modificado</strong> o <strong style={{ color: '#f87171' }}>eliminado</strong> en cualquiera de los SharePoints monitoreados.</p>
              <StepList steps={[
                'Un proceso automatizado (GitHub Actions) ejecuta un escaneo cada 5 minutos.',
                'El escaneo compara el estado actual de los archivos contra la última foto conocida (baseline).',
                'Las diferencias se registran como eventos de auditoría en la base de datos.',
                'Puedes ver estos eventos en el módulo "Reportes" del panel de administración.',
              ]} />
            </Collapsible>

            <Collapsible title="Editores Activos (Vista en Vivo)">
              <p className="doc-p">En el panel del administrador, la sección de "Reportes" muestra qué usuarios están editando documentos en este momento (últimos 5 minutos). Incluye vista previa en línea del documento abierto usando Office Online embed.</p>
            </Collapsible>
          </section>

          {}
          <section id="reportes" className="doc-section">
            <h2 className="doc-h2">📈 Reportes Automáticos</h2>
            <p className="doc-p">El sistema genera reportes automáticamente basándose en la actividad detectada en SharePoint.</p>

            <InfoCard emoji="⚙️" title="GitHub Actions (Cron Job)" color="#6366f1">
              <span>Un flujo de trabajo automatizado se ejecuta <strong>cada 5 minutos</strong>, 24/7, sin necesidad de que la aplicación esté abierta.
              Este proceso escanea todos los drives de SharePoint usando la API de Microsoft Graph y detecta cambios.</span>
            </InfoCard>

            <InfoCard emoji="🔔" title="Webhooks de Microsoft Graph" color="#f59e0b">
              <span>Adicionalmente a los cron jobs, el sistema tiene configurados webhooks que Microsoft notifica en tiempo real cuando hay cambios en archivos.
              Esto permite detección casi instantánea de modificaciones.</span>
            </InfoCard>

            <Collapsible title="¿Qué tipos de eventos se registran?">
              <table className="doc-table">
                <thead><tr><th>Evento</th><th>Descripción</th><th>Color</th></tr></thead>
                <tbody>
                  <tr><td>AUTO_CREATE</td><td>Archivo nuevo detectado</td><td><span style={{ color: '#4ade80' }}>🟢 Verde</span></td></tr>
                  <tr><td>AUTO_MODIFY</td><td>Archivo existente fue editado</td><td><span style={{ color: '#fbbf24' }}>🟡 Amarillo</span></td></tr>
                  <tr><td>AUTO_DELETE</td><td>Archivo fue eliminado</td><td><span style={{ color: '#f87171' }}>🔴 Rojo</span></td></tr>
                </tbody>
              </table>
            </Collapsible>

            <Collapsible title="Exportar reportes">
              <StepList steps={[
                'Abre el módulo "Reportes" en el panel de administración.',
                'Aplica los filtros deseados (empresa, fecha, usuario).',
                'Haz clic en el botón "Exportar a Excel" o "Generar Reporte Inteligente".',
                'Se descargará un archivo .xlsx con formato profesional.',
              ]} />
            </Collapsible>
          </section>

          {}
          <section id="cursos" className="doc-section">
            <h2 className="doc-h2">🎓 Cursos y Capacitaciones</h2>
            <p className="doc-p">El módulo de cursos permite crear presentaciones interactivas y asignarlas a empresas.</p>

            <Collapsible title="Crear un curso" defaultOpen>
              <StepList steps={[
                'Ve al módulo "Cursos" del panel de administración.',
                'Haz clic en "Crear Curso".',
                'Llena el título, descripción e ícono del curso.',
                'Agrega diapositivas con texto, imágenes, o contenido HTML.',
                'Selecciona a qué empresas asignar el curso.',
                'Guarda el curso. Las empresas seleccionadas podrán verlo en su portal.',
              ]} />
            </Collapsible>

            <Collapsible title="Vista previa como Empresa">
              <p className="doc-p">Desde el editor de cursos puedes hacer clic en "Vista Previa" para ver exactamente cómo se verá el curso para la empresa. También puedes filtrar la vista previa por empresa específica.</p>
            </Collapsible>

            <Collapsible title="Reordenar cursos">
              <p className="doc-p">Los cursos se pueden reorganizar usando drag & drop. Arrastra las tarjetas para cambiar su orden de presentación. El nuevo orden se guarda automáticamente.</p>
            </Collapsible>
          </section>

          {}
          <section id="entrevistas" className="doc-section">
            <h2 className="doc-h2">📝 Entrevistas / Reclutamiento</h2>
            <p className="doc-p">Este módulo permite crear encuestas de reclutamiento, generar enlaces públicos para candidatos, y revisar sus respuestas.</p>

            <Collapsible title="Crear una nueva entrevista" defaultOpen>
              <StepList steps={[
                'Ve al módulo "Entrevistas" del panel de administración.',
                'Haz clic en "Nueva Entrevista".',
                'Define el título y descripción de la entrevista.',
                'Agrega preguntas: texto libre, selección múltiple, etc.',
                'Marca qué preguntas son obligatorias.',
                'Guarda y activa la entrevista.',
                'Se generará un enlace público que puedes compartir con los candidatos.',
              ]} />
            </Collapsible>

            <Collapsible title="¿Cómo responde un candidato?">
              <StepList steps={[
                'El candidato abre el enlace de la entrevista en su navegador.',
                'Llena su nombre completo, email y teléfono.',
                'Responde todas las preguntas marcadas como obligatorias.',
                'Envía sus respuestas. El sistema confirmará la recepción.',
              ]} />
              <InfoCard emoji="🛡️" title="Protecciones" color="#ef4444">
                <span>El sistema tiene <strong>rate limiting</strong> para evitar spam: máximo 5 envíos por minuto por IP. Además, valida que no se envíen respuestas a entrevistas inactivas.</span>
              </InfoCard>
            </Collapsible>

            <Collapsible title="Revisar respuestas">
              <p className="doc-p">Desde el panel de administración puedes ver un listado completo de candidatos con sus respuestas, filtrar por estado, y exportar la información.</p>
            </Collapsible>
          </section>

          {}
          <section id="errores" className="doc-section">
            <h2 className="doc-h2">⚠️ Errores Comunes y Soluciones</h2>

            <Collapsible title="La sesión se cierra sola / me pide volver a iniciar sesión" defaultOpen>
              <p className="doc-p">Esto es normal. Las sesiones tienen tiempos de expiración por seguridad:</p>
              <ul style={{ color: '#94a3b8', lineHeight: 2, paddingLeft: 20 }}>
                <li><strong style={{ color: '#e2e8f0' }}>Administrador:</strong> Expira en 2 horas.</li>
                <li><strong style={{ color: '#e2e8f0' }}>Funcionario:</strong> Expira en 10 minutos de inactividad.</li>
                <li><strong style={{ color: '#e2e8f0' }}>Empresa:</strong> Expira en 1 hora.</li>
              </ul>
              <p className="doc-p"><strong style={{ color: '#4ade80' }}>Solución:</strong> Simplemente inicie sesión nuevamente.</p>
            </Collapsible>

            <Collapsible title="No se cargan los archivos de OneDrive">
              <p className="doc-p">Esto ocurre cuando la autenticación de Microsoft expiró o no se ha iniciado.</p>
              <StepList steps={[
                'Busca el botón "Sign in with Microsoft" en la sección de archivos.',
                'Haz clic e inicia sesión con tu cuenta Microsoft 365 organizacional.',
                'Si el problema persiste, cierra sesión y vuelve a iniciarla.',
              ]} />
              <WarningCard>Las cuentas personales de Microsoft (Hotmail, Outlook) no funcionan. Debe ser una cuenta organizacional (Microsoft 365 / Azure AD).</WarningCard>
            </Collapsible>

            <Collapsible title='El reporte de archivos muestra "0 cambios"'>
              <StepList steps={[
                'Verifica que el GitHub Action esté corriendo correctamente. Ve al repositorio > Actions.',
                'Asegúrate de que las variables secretas (APP_URL y CRON_SECRET) estén configuradas en GitHub.',
                'Desde el panel de Reportes, haz clic en el botón de actualización manual para forzar un escaneo.',
              ]} />
            </Collapsible>

            <Collapsible title="Error al crear un funcionario: usuario duplicado">
              <p className="doc-p">El nombre de usuario ya existe en el sistema. Prueba con un nombre diferente.</p>
            </Collapsible>

            <Collapsible title="No puedo ver los cursos como empresa">
              <StepList steps={[
                'Verifica que el administrador haya asignado cursos a tu empresa.',
                'Cierra sesión y vuelve a ingresar.',
                'Si el problema persiste, contacta al administrador.',
              ]} />
            </Collapsible>

            <Collapsible title="La página muestra una pantalla en blanco">
              <StepList steps={[
                'Abre la consola del navegador (F12 > Console) para ver si hay errores.',
                'Intenta limpiar caché: Ctrl + Shift + R (o Cmd + Shift + R en Mac).',
                'Verifica que la URL sea correcta y que el servidor esté activo.',
                'Si el problema persiste, contacte al equipo técnico.',
              ]} />
            </Collapsible>

            <Collapsible title="Las fechas aparecen mal o dicen 'Invalid Date' en el Excel">
              <p className="doc-p">Esto se solucionó en una actualización reciente. Si aún ocurre:</p>
              <StepList steps={[
                'Verifica que los registros tengan fechas válidas en el sistema.',
                'Intenta exportar de nuevo.',
                'Si el problema persiste, borre y re-cree el registro afectado.',
              ]} />
            </Collapsible>
          </section>

          {}
          <section id="faq" className="doc-section">
            <h2 className="doc-h2">❓ Preguntas Frecuentes</h2>

            {}
            <div className="doc-search">
              <SearchIcon className="doc-icon" style={{ color: '#475569', width: 18, height: 18 }} />
              <input
                placeholder="Buscar en las preguntas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {filteredFaq.length === 0 && (
              <p className="doc-p" style={{ textAlign: 'center', padding: '24px 0' }}>No se encontraron resultados para &quot;{searchQuery}&quot;</p>
            )}

            {filteredFaq.map((faq, i) => (
              <Collapsible key={i} title={faq.q}>
                <p className="doc-p" style={{ margin: 0 }}>{faq.a}</p>
              </Collapsible>
            ))}
          </section>

          {}
          <footer className="doc-footer">
            <p>© 2026 PRG Auditores — Tu confianza, nuestro compromiso</p>
            <p style={{ marginTop: 6 }}>Este documento es confidencial y de uso interno.</p>
          </footer>
        </main>
      </div>
    </>
  );
}
