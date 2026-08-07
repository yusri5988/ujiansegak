import { html } from 'hono/html'

// Placeholders prevent legacy commented template fragments from being evaluated while the page is rendered.
const formatDate = (_date?: string) => ''
const schedule = { trainingDate: '', dueDate: '' }
const item = { studentName: '', scheduleTitle: '', submissionDate: '', studentNotes: '', reviewStatus: '' }

export const renderApp = (initialPath = '/login') => html`<!DOCTYPE html>
<html lang="ms" class="h-full bg-[#edf4f1]">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Sistem Ujian SEGAK</title>

  <!-- PWA Metadata & Icons -->
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#153b36">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="apple-touch-icon" href="https://cdn-icons-png.flaticon.com/512/2964/2964514.png">

  <!-- Google Fonts & TailwindCSS -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', 'sans-serif'],
          }
        }
      }
    }
    window.initialPath = "${initialPath}";
  </script>
  <style>
    :root {
      --segak-ink: #153b36;
      --segak-green: #1d6b5c;
      --segak-mint: #e3f2ec;
      --segak-cream: #fffaf0;
      --segak-line: #d9e7e1;
      --segak-muted: #71817c;
    }
    * { box-sizing: border-box; }
    body { font-family: 'Plus Jakarta Sans', sans-serif; -webkit-tap-highlight-color: transparent; background: #edf4f1 !important; }
    .mobile-container { max-width: 1280px; margin: 0 auto; min-height: 100vh; background: #f7faf8; box-shadow: 0 0 50px rgba(21,59,54,.08); border-color: var(--segak-line); }
    .bottom-nav { max-width: 1280px; margin: 0 auto; background: rgba(255,255,255,.96) !important; color: var(--segak-ink) !important; border-color: var(--segak-line) !important; box-shadow: 0 -8px 24px rgba(21,59,54,.08); }
    header.bg-slate-900 { background: rgba(255,255,255,.96) !important; color: var(--segak-ink) !important; border-color: var(--segak-line) !important; box-shadow: 0 1px 0 rgba(21,59,54,.08); }
    header .bg-slate-800 { background: var(--segak-ink) !important; border-color: var(--segak-ink) !important; color: #fff !important; }
    header .text-white, header .text-slate-200 { color: var(--segak-ink) !important; }
    header .text-slate-400 { color: var(--segak-muted) !important; }
    main { width: 100%; max-width: 1180px; margin: 0 auto; padding: 28px 24px 100px !important; }
    .bg-white { border-color: var(--segak-line) !important; border-radius: 18px !important; box-shadow: 0 10px 25px rgba(21,59,54,.045) !important; }
    .bg-slate-50 { background: #f3f8f5 !important; border-color: var(--segak-line) !important; }
    .bg-slate-100, .bg-slate-200 { background: var(--segak-mint) !important; border-color: var(--segak-line) !important; }
    .bg-slate-900, .bg-slate-800 { background: var(--segak-ink) !important; }
    .text-slate-900, .text-slate-800 { color: var(--segak-ink) !important; }
    .text-slate-700, .text-slate-600 { color: #36554e !important; }
    .text-slate-500, .text-slate-400 { color: var(--segak-muted) !important; }
    input, select { border-color: #c8d9d2 !important; background: #fff !important; border-radius: 10px !important; }
    input:focus, select:focus { border-color: var(--segak-green) !important; box-shadow: 0 0 0 3px rgba(29,107,92,.12); }
    button.bg-slate-900, button.bg-slate-800 { background: var(--segak-green) !important; box-shadow: 0 6px 14px rgba(29,107,92,.18); }
    button.bg-slate-900:hover, button.bg-slate-800:hover { background: var(--segak-ink) !important; }
    #loginScreen { max-width: 480px; margin: 0 auto; padding-top: 12px; }
    #loginForm button { min-height: 44px; }
    #studentDashboard, #teacherDashboard, #adminDashboard { animation: pageIn .35s ease-out; }
    #studentDashboard.hidden, #teacherDashboard.hidden, #adminDashboard.hidden { display: none !important; }
    .bottom-nav button { color: var(--segak-muted); transition: all .15s ease; }
    .bottom-nav button.active-nav-item { color: var(--segak-green) !important; font-weight: 700; }
    [id^="modal"] > div { border-radius: 20px !important; }
    @keyframes pageIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    @media (min-width: 768px) {
      #studentDashboard { display: grid; grid-template-columns: 1fr 1.35fr; align-items: start; gap: 18px; }
      #studentDashboard > :first-child, #studentDashboard > :nth-child(2) { grid-column: 1 / -1; }
      #adminDashboard { max-width: 900px; }
    }
    @media (max-width: 640px) {
      main { padding: 18px 14px 88px !important; }
      #loginScreen { padding-top: 28px; }
    }
  </style>
</head>
<body class="bg-slate-900 text-slate-800 antialiased h-full">

  <!-- Mobile App Outer Frame (Minimal Modern Theme) -->
  <div class="mobile-container flex flex-col justify-between shadow-xl relative pb-20 bg-slate-50 border-x border-slate-200 min-h-screen">

    <!-- Mobile Header Bar (Minimal Dark Slate - Hidden on Login) -->
    <header id="appHeader" class="hidden bg-slate-900 text-white px-4 py-3 sticky top-0 z-40 shadow-sm border-b border-slate-800 flex justify-between items-center">
      <div class="flex items-center space-x-2.5 cursor-pointer" onclick="navigateTo('/')">
        <div class="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-base">
          S
        </div>
        <div>
          <span class="font-bold text-sm tracking-tight text-white block leading-tight">Ujian SEGAK</span>
          <span class="text-[10px] text-slate-400 font-medium block">Kecergasan Sekolah</span>
        </div>
      </div>
      <div id="userHeaderNav" class="hidden flex items-center space-x-2">
        <button onclick="logout()" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition border border-slate-700">
          Log Keluar
        </button>
      </div>
    </header>

    <!-- PWA Install Banner (Minimal Slate Accent) -->
    <style>#pwaInstallBanner > div:first-child > span:first-child { display: none; }</style>
    <div id="pwaInstallBanner" class="hidden bg-slate-800 text-slate-200 px-4 py-2.5 flex justify-between items-center border-b border-slate-700">
      <div class="flex items-center space-x-2 text-xs font-medium">
        <span>ðŸ“²</span>
        <span>Pasang Aplikasi SEGAK pada peranti anda</span>
      </div>
      <button onclick="installPWA()" class="px-3 py-1 bg-white text-slate-900 rounded-lg text-xs font-bold shadow-sm">
        Pasang
      </button>
    </div>

    <!-- Main Content Area -->
    <main class="flex-grow p-4 space-y-4">

      <!-- SCREEN 1: LOGIN SCREEN (Redesigned Modern Clean & Professional) -->
      <div id="loginScreen" class="py-6 max-w-md mx-auto space-y-5">
        
        <!-- Header Branding Card -->
        <div class="text-center space-y-2">
          <div class="w-14 h-14 bg-gradient-to-tr from-[#153b36] to-[#1d6b5c] text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-emerald-900/20 border border-emerald-600/30 ring-4 ring-emerald-500/10">
            <svg class="w-7 h-7 text-emerald-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div class="space-y-1 pt-1">
            <h2 class="text-2xl font-extrabold text-[#153b36] tracking-tight">Log Masuk Sistem</h2>
            <p class="text-xs font-medium text-slate-500 max-w-xs mx-auto">Sistem Pengurusan Ujian SEGAK & Rekod Latihan Harian KPM</p>
          </div>
        </div>

        <!-- Alert Container -->
        <div id="loginAlert" class="hidden p-3.5 rounded-xl text-xs bg-red-50 text-red-700 border border-red-200 font-medium flex items-center space-x-2 shadow-xs"></div>

        <!-- Main Login Card -->
        <form id="loginForm" onsubmit="handleLogin(event)" class="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/50 space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">ID Murid / Emel Pengguna</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input type="text" id="loginUsername" required class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#1d6b5c] focus:outline-none focus:ring-4 focus:ring-emerald-600/10 transition-all" placeholder="M1001 atau cikgu.ahmad@segak.moe.edu.my">
            </div>
          </div>

          <div>
            <div class="flex justify-between items-center mb-1.5">
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide">Kata Laluan</label>
            </div>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input type="password" id="loginPassword" required class="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#1d6b5c] focus:outline-none focus:ring-4 focus:ring-emerald-600/10 transition-all" placeholder="••••••••">
              <button type="button" onclick="togglePasswordVisibility()" class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>

          <button type="submit" class="w-full py-3 bg-gradient-to-r from-[#1d6b5c] to-[#153b36] hover:from-[#153b36] hover:to-[#0f2d29] active:scale-[0.99] text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-900/15 transition-all flex items-center justify-center space-x-2 group">
            <span>Log Masuk Akaun</span>
            <svg class="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>

        <!-- Quick Demo Login Card -->
        <div class="hidden bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2.5">
          <div class="flex items-center justify-center space-x-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Log Masuk Pantas (Demo)</p>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <button type="button" onclick="quickLogin('admin@segak.moe.edu.my', 'Admin1234!')" class="group flex flex-col items-center justify-center p-2.5 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/80 hover:border-emerald-200 rounded-xl transition-all">
              <span class="text-base mb-0.5">🛡️</span>
              <span class="text-[11px] font-bold text-slate-700 group-hover:text-emerald-900">Admin</span>
            </button>
            <button type="button" onclick="quickLogin('cikgu.ahmad@segak.moe.edu.my', 'Guru1234!')" class="group flex flex-col items-center justify-center p-2.5 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/80 hover:border-emerald-200 rounded-xl transition-all">
              <span class="text-base mb-0.5">👨‍🏫</span>
              <span class="text-[11px] font-bold text-slate-700 group-hover:text-emerald-900">Cikgu</span>
            </button>
            <button type="button" onclick="quickLogin('M1001', 'Murid1234!')" class="group flex flex-col items-center justify-center p-2.5 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/80 hover:border-emerald-200 rounded-xl transition-all">
              <span class="text-base mb-0.5">🎓</span>
              <span class="text-[11px] font-bold text-slate-700 group-hover:text-emerald-900">Murid</span>
            </button>
          </div>
        </div>

        <!-- Footer note -->
        <p class="hidden text-center text-[11px] text-slate-400 font-medium">
          🔒 Sambungan Selamat • Sistem Ujian SEGAK v1.0
        </p>

      </div>

      <!-- SCREEN 2: STUDENT DASHBOARD -->
      <div id="studentDashboard" class="hidden space-y-4">
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selamat Datang</span>
            <h1 class="text-base font-bold text-slate-900"><span id="studentDashboardName">Murid</span></h1>
          </div>
          <span id="todayDateBadge" class="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">Hari Ini</span>
        </div>

        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div class="border-b border-slate-100 pb-2">
            <h3 class="font-bold text-sm text-slate-900">Latihan Saya</h3>
            <p class="text-[10px] text-slate-500">Buka latihan yang cikgu tetapkan mengikut tarikh dan tandakan selepas selesai.</p>
          </div>
          <div id="studentAssignmentList" class="space-y-2">
            <p class="text-xs text-slate-400 text-center py-3">Memuatkan latihan...</p>
          </div>
        </div>
      </div>

      <!-- SCREEN 3: TEACHER DASHBOARD (Minimal Theme) -->
      <div id="teacherDashboard" class="hidden space-y-4">

        <!-- TAB 1: SENARAI KELAS -->
        <div id="tabTeacherClasses" class="space-y-4">
          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div class="flex justify-between items-center">
              <h3 class="font-bold text-sm text-slate-900">Senarai Kelas Guru</h3>
              <button onclick="toggleModal('modalCreateClass', true)" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold">
                + Tambah Kelas
              </button>
            </div>
            <div id="classListContainer" class="space-y-2">
              <p class="text-xs text-slate-400 text-center">Memuatkan senarai kelas...</p>
            </div>
          </div>

          <div id="studentListSection" class="hidden bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div class="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 id="currentClassName" class="font-bold text-sm text-slate-900">Senarai Murid</h3>
              <button onclick="toggleModal('modalAddStudent', true)" class="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold">
                + Murid
              </button>
            </div>
            <div id="studentCardsContainer" class="space-y-2">
              <!-- Dynamic Minimal Student Cards -->
            </div>
          </div>
        </div>

        <!-- TAB 2: PANTAUAN LATIHAN -->
        <div id="tabTeacherDailyLogs" class="hidden space-y-4">
          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pemantauan tugasan</span>
              <h3 class="font-bold text-base text-slate-900">Penghantaran latihan murid</h3>
              <p class="text-[11px] text-slate-500">Semak latihan yang sudah dihantar oleh murid.</p>
            </div>
          </div>
          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div class="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 class="font-bold text-sm text-slate-900">Senarai penghantaran</h3>
              <button onclick="loadTeacherSubmissions()" class="text-[10px] font-semibold text-emerald-700">Muat semula</button>
            </div>
            <div id="teacherSubmissionList" class="space-y-2">
              <p class="text-xs text-slate-400 text-center py-3">Memuatkan penghantaran...</p>
            </div>
          </div>
        </div>

        <!-- TAB 3: PENGURUSAN LATIHAN GURU -->
        <div id="tabTeacherTraining" class="hidden space-y-4">
          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div class="flex justify-between items-center">
              <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Latihan mengikut tarikh</span>
                <h3 class="font-bold text-sm text-slate-900">Latihan Murid</h3>
              </div>
              <button onclick="toggleModal('modalCreateSchedule', true)" class="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold">
                + Beri Latihan
              </button>
            </div>
            <div id="trainingScheduleList" class="space-y-2">
              <p class="text-xs text-slate-400 text-center">Memuatkan jadual...</p>
            </div>
          </div>
        </div>
      </div>

      <!-- SCREEN 4: ADMIN DASHBOARD (Minimal Theme) -->
      <div id="adminDashboard" class="hidden space-y-4">
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <h1 class="text-base font-bold text-slate-900">Dashboard Pentadbir</h1>
            <p class="text-[10px] text-slate-500">Pengurusan Sekolah & Akaun Guru</p>
          </div>
          <button onclick="toggleModal('modalCreateSchool', true)" class="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold">
            + Sekolah
          </button>
        </div>

        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h3 class="font-bold text-sm text-slate-900">Senarai Sekolah Didaftarkan</h3>
          <div id="adminSchoolList" class="space-y-2 text-xs">
            <p class="text-slate-400 text-center">Memuatkan senarai sekolah...</p>
          </div>
        </div>
      </div>

    </main>

    <!-- Mobile Fixed Bottom Navigation Bar (Minimal Clean Theme) -->
    <nav id="bottomNav" class="hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg bottom-nav">
      <div id="bottomNavInner" class="grid grid-cols-4 h-14 items-center text-center text-[10px] font-semibold max-w-lg mx-auto">
        <!-- Dynamically rendered based on role -->
      </div>
    </nav>

  </div>

  <!-- MODALS (Minimal Clean Design) -->
  <div id="modalCreateClass" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-xl p-5 max-w-xs w-full shadow-xl space-y-3 border border-slate-200">
      <h3 class="font-bold text-sm text-slate-900">Tambah Kelas Baharu</h3>
      <form onsubmit="handleCreateClass(event)" class="space-y-3 text-xs">
        <div>
          <label class="font-semibold block mb-1 text-slate-700">Nama Kelas</label>
          <input type="text" id="newClassName" required class="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50" placeholder="Contoh: 5 Cemerlang">
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <button type="button" onclick="toggleModal('modalCreateClass', false)" class="px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-semibold">Batal</button>
          <button type="submit" class="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg font-semibold">Simpan</button>
        </div>
      </form>
    </div>
  </div>

  <div id="modalAddStudent" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-xl p-5 max-w-xs w-full shadow-xl space-y-3 border border-slate-200">
      <h3 class="font-bold text-sm text-slate-900">Tambah Murid Baharu</h3>
      <form onsubmit="handleAddStudent(event)" class="space-y-3 text-xs">
        <div>
          <label class="font-semibold block mb-1 text-slate-700">ID / No. Matrik Murid</label>
          <input type="text" id="addStudentIdNum" required class="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50" placeholder="M1006">
        </div>
        <div>
          <label class="font-semibold block mb-1 text-slate-700">Nama Penuh Murid</label>
          <input type="text" id="addStudentName" required class="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50" placeholder="Ahmad Firdaus">
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="font-semibold block mb-1 text-slate-700">Jantina</label>
            <select id="addStudentGender" class="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50"><option value="L">Lelaki</option><option value="P">Perempuan</option></select>
          </div>
          <div>
            <label class="font-semibold block mb-1 text-slate-700">Tarikh Lahir</label>
            <input type="date" id="addStudentDob" required class="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50">
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <button type="button" onclick="toggleModal('modalAddStudent', false)" class="px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-semibold">Batal</button>
          <button type="submit" class="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg font-semibold">Simpan</button>
        </div>
      </form>
    </div>
  </div>

  <div id="modalCreateSchedule" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-xl p-5 max-w-xs w-full shadow-xl space-y-3 border border-slate-200">
      <h3 class="font-bold text-sm text-slate-900">Beri Latihan Kepada Murid</h3>
      <form onsubmit="handleCreateSchedule(event)" class="space-y-3 text-xs max-h-[75vh] overflow-y-auto">
        <div>
          <label class="font-semibold block mb-1 text-slate-700">Kelas</label>
          <select id="scheduleClassId" required class="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50"><option value="">Pilih kelas</option></select>
        </div>
        <div>
          <label class="font-semibold block mb-1 text-slate-700">Tajuk Latihan</label>
          <input type="text" id="scheduleTitle" required class="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50" placeholder="Contoh: Latihan Kekuatan Minggu 1">
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div><label class="font-semibold block mb-1 text-slate-700">Tarikh latihan</label><input type="date" id="scheduleTrainingDate" required class="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50"></div>
        </div>
        <div><label class="font-semibold block mb-1 text-slate-700">Arahan</label><textarea id="scheduleInstructions" rows="2" class="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50" placeholder="Terangkan cara murid perlu buat latihan."></textarea></div>
        <div><label class="font-semibold block mb-1 text-slate-700">Link Video YouTube</label><textarea id="scheduleActivities" rows="3" required class="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50" placeholder="Satu link setiap baris:\nhttps://youtu.be/...\nhttps://www.youtube.com/watch?v=..."></textarea><p class="text-[9px] text-slate-400 mt-1">Masukkan satu link YouTube bagi setiap aktiviti. Video akan dimainkan terus di halaman murid.</p></div>
        <div class="flex justify-end gap-2 pt-1">
          <button type="button" onclick="toggleModal('modalCreateSchedule', false)" class="px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-semibold">Batal</button>
          <button type="submit" class="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg font-semibold">Terbitkan Latihan</button>
        </div>
      </form>
    </div>
  </div>

  <div id="modalSubmitTraining" class="hidden fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
    <div class="bg-white rounded-2xl p-4 sm:p-6 max-w-5xl w-full max-h-[96vh] overflow-y-auto shadow-xl space-y-4 border border-slate-200">
      <h3 id="submitTrainingTitle" class="font-bold text-base sm:text-lg text-slate-900">Hantar Latihan</h3>
      <p id="submitTrainingInstructions" class="text-[10px] text-slate-500"></p>
      <div id="submitTrainingActivities" class="space-y-4"></div>
      <input type="hidden" id="submitAssignmentId"><input type="hidden" id="submitScheduleId">
      <div><label class="font-semibold block mb-1 text-slate-700 text-xs">Catatan (pilihan)</label><textarea id="submitTrainingNotes" rows="2" class="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 text-xs" placeholder="Catatan untuk cikgu"></textarea></div>
      <div class="flex justify-end gap-2 pt-1"><button type="button" onclick="toggleModal('modalSubmitTraining', false)" class="px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-semibold text-xs">Batal</button><button type="button" onclick="submitTrainingAssignment()" class="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg font-semibold text-xs">Tandakan Selesai</button></div>
    </div>
  </div>

  <!-- JAVASCRIPT APPLICATION ROUTER & LOGIC -->
  <script>
    let currentUser = null;
    let currentToken = localStorage.getItem('segak_token');
    let activeClassId = null;
    let deferredPrompt = null;

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js').then(function(reg) {
          console.log('PWA ServiceWorker ready:', reg.scope);
        }).catch(function(err) {
          console.log('ServiceWorker failed:', err);
        });
      });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      const banner = document.getElementById('pwaInstallBanner');
      if (banner) banner.classList.remove('hidden');
    });

    function installPWA() {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        deferredPrompt = null;
        const banner = document.getElementById('pwaInstallBanner');
        if (banner) banner.classList.add('hidden');
      });
    }

    window.onload = function() {
      const today = new Date().toISOString().split('T')[0];
      const todayBadge = document.getElementById('todayDateBadge');
      if (todayBadge) todayBadge.textContent = 'Tarikh: ' + today;

      if (currentToken) {
        fetchCurrentUser();
      } else {
        navigateTo('/login', false);
      }
    };

    window.onpopstate = function() {
      routeToPath(window.location.pathname);
    };

    function navigateTo(path, push = true) {
      if (push && window.location.pathname !== path) {
        history.pushState(null, '', path);
      }
      routeToPath(path);
    }

    function navigateToRoleHome() {
      if (!currentUser) return navigateTo('/login');
      if (currentUser.role === 'admin') navigateTo('/admin/dashboard');
      else if (currentUser.role === 'teacher') navigateTo('/teacher/classes');
      else navigateTo('/student/dashboard');
    }

    function navigateToRoleActivity() {
      if (!currentUser) return navigateTo('/login');
      if (currentUser.role === 'teacher') navigateTo('/teacher/training');
      else if (currentUser.role === 'student') navigateTo('/student/dashboard');
    }

    function routeToPath(path) {
      const appHeader = document.getElementById('appHeader');
      if (!currentUser) {
        showScreen('loginScreen');
        document.getElementById('bottomNav').classList.add('hidden');
        document.getElementById('userHeaderNav').classList.add('hidden');
        if (appHeader) appHeader.classList.add('hidden');
        if (window.location.pathname !== '/login') history.replaceState(null, '', '/login');
        return;
      }

      document.getElementById('bottomNav').classList.remove('hidden');
      document.getElementById('userHeaderNav').classList.remove('hidden');
      if (appHeader) appHeader.classList.remove('hidden');

      renderRoleBottomNav();

      const role = currentUser.role;
      if (role === 'admin') {
        showScreen('adminDashboard');
        if (!path.startsWith('/admin')) history.replaceState(null, '', '/admin/dashboard');
        loadAdminData();
      } else if (role === 'teacher') {
        showScreen('teacherDashboard');
        if (path === '/teacher/segak' || path === '/teacher/training') {
          showTab('teacherTraining');
        } else if (path === '/teacher/daily-log') {
          showTab('teacherDailyLogs');
        } else {
          showTab('teacherClasses');
          if (path !== '/teacher/classes' && path !== '/teacher/dashboard') {
            history.replaceState(null, '', '/teacher/dashboard');
          }
        }
        loadTeacherClasses();
        if (path === '/teacher/segak' || path === '/teacher/training') loadTeacherSchedules();
        if (path === '/teacher/daily-log') loadTeacherSubmissions();
      } else if (role === 'student') {
        showScreen('studentDashboard');
        if (!path.startsWith('/student')) history.replaceState(null, '', '/student/dashboard');
        document.getElementById('studentDashboardName').textContent = currentUser.profile?.fullName || currentUser.username;
        loadStudentAssignments();
      }
    }

    function showScreen(screenId) {
      document.getElementById('loginScreen').classList.add('hidden');
      document.getElementById('teacherDashboard').classList.add('hidden');
      document.getElementById('studentDashboard').classList.add('hidden');
      document.getElementById('adminDashboard').classList.add('hidden');
      document.getElementById(screenId).classList.remove('hidden');
    }

    function toggleModal(modalId, show) {
      const el = document.getElementById(modalId);
      if (show) el.classList.remove('hidden');
      else el.classList.add('hidden');
    }

    function togglePasswordVisibility() {
      const pwd = document.getElementById('loginPassword');
      if (pwd) {
        pwd.type = pwd.type === 'password' ? 'text' : 'password';
      }
    }

    function quickLogin(username, password) {
      const uEl = document.getElementById('loginUsername');
      const pEl = document.getElementById('loginPassword');
      if (uEl) uEl.value = username;
      if (pEl) pEl.value = password;
      handleLogin(new Event('submit'));
    }

    window.quickLogin = quickLogin;
    window.togglePasswordVisibility = togglePasswordVisibility;
    window.navigateTo = navigateTo;
    window.navigateToRoleHome = navigateToRoleHome;
    window.navigateToRoleActivity = navigateToRoleActivity;

    async function handleLogin(e) {
      window.handleLogin = handleLogin;
      if (e) e.preventDefault();
      const username = document.getElementById('loginUsername').value;
      const password = document.getElementById('loginPassword').value;
      const alertEl = document.getElementById('loginAlert');
      alertEl.classList.add('hidden');

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!data.success) {
          alertEl.textContent = data.message;
          alertEl.classList.remove('hidden');
          return;
        }

        currentToken = data.token;
        localStorage.setItem('segak_token', currentToken);
        currentUser = data.user;
        setupUserNav();

        if (currentUser.role === 'admin') navigateTo('/admin/dashboard');
        else if (currentUser.role === 'teacher') navigateTo('/teacher/dashboard');
        else if (currentUser.role === 'student') navigateTo('/student/dashboard');
      } catch (err) {
        alertEl.textContent = 'Ralat sambungan ke pelayan.';
        alertEl.classList.remove('hidden');
      }
    }

    async function fetchCurrentUser() {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': 'Bearer ' + currentToken }
        });
        const data = await res.json();
        if (data.success) {
          currentUser = data.user;
          setupUserNav();
          const targetPath = window.location.pathname === '/' || window.location.pathname === '/login' ? (
            currentUser.role === 'admin' ? '/admin/dashboard' :
            currentUser.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'
          ) : window.location.pathname;
          navigateTo(targetPath, false);
        } else {
          logout();
        }
      } catch {
        logout();
      }
    }

    function setupUserNav() {
      const userNav = document.getElementById('userHeaderNav');
      if (userNav) userNav.classList.remove('hidden');
      const nameEl = document.getElementById('navUserName');
      if (nameEl) nameEl.textContent = currentUser.profile?.fullName || currentUser.username;
      const roleEl = document.getElementById('navUserRole');
      if (roleEl) roleEl.textContent = currentUser.role;
    }

    function logout() {
      localStorage.removeItem('segak_token');
      currentToken = null;
      currentUser = null;
      document.getElementById('userHeaderNav').classList.add('hidden');
      document.getElementById('bottomNav').classList.add('hidden');
      const appHeader = document.getElementById('appHeader');
      if (appHeader) appHeader.classList.add('hidden');
      navigateTo('/login');
    }
    window.logout = logout;
    window.toggleModal = toggleModal;
    window.showTab = showTab;

    function renderRoleBottomNav() {
      const navInner = document.getElementById('bottomNavInner');
      if (!navInner || !currentUser) return;

      if (currentUser.role === 'teacher') {
        navInner.className = 'grid grid-cols-3 h-14 items-center text-center text-[10px] font-semibold max-w-lg mx-auto';
        navInner.innerHTML = 
          '<button id="bNavClasses" class="flex flex-col items-center justify-center space-y-0.5 py-1 text-slate-400 hover:text-[#1d6b5c]"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0M7 7h10" /></svg><span>Kelas</span></button>' +
          '<button id="bNavDailyLogs" class="flex flex-col items-center justify-center space-y-0.5 py-1 text-slate-400 hover:text-[#1d6b5c]"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg><span>Pantauan</span></button>' +
          '<button id="bNavSegak" class="flex flex-col items-center justify-center space-y-0.5 py-1 text-slate-400 hover:text-[#1d6b5c]"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg><span>Skor SEGAK</span></button>' +
          '<button id="bNavTraining" class="flex flex-col items-center justify-center space-y-0.5 py-1 text-slate-400 hover:text-[#1d6b5c]"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span>Jadual</span></button>';

        const legacySegakNav = document.getElementById('bNavSegak');
        if (legacySegakNav) legacySegakNav.style.display = 'none';
        const trainingLabel = document.querySelector('#bNavTraining span');
        if (trainingLabel) trainingLabel.textContent = 'Latihan';
        const b1 = document.getElementById('bNavClasses'); if (b1) b1.onclick = function() { navigateTo('/teacher/classes'); };
        const b2 = document.getElementById('bNavDailyLogs'); if (b2) b2.onclick = function() { navigateTo('/teacher/daily-log'); };
        const b3 = document.getElementById('bNavTraining'); if (b3) b3.onclick = function() { navigateTo('/teacher/training'); };
      } else {
        navInner.className = 'grid grid-cols-3 h-14 items-center text-center text-[10px] font-semibold max-w-lg mx-auto';
        navInner.innerHTML = 
          '<button id="navBtnHome" class="flex flex-col items-center justify-center space-y-0.5 py-1 text-slate-500 hover:text-[#1d6b5c]"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg><span>Utama</span></button>' +
          '<button id="navBtnActivity" class="flex flex-col items-center justify-center space-y-0.5 py-1 text-slate-500 hover:text-[#1d6b5c]"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg><span>Aktiviti</span></button>' +
          '<button id="navBtnProfile" class="flex flex-col items-center justify-center space-y-0.5 py-1 text-slate-500 hover:text-red-600"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg><span>Keluar</span></button>';

        const h = document.getElementById('navBtnHome'); if (h) h.onclick = function() { navigateToRoleHome(); };
        const a = document.getElementById('navBtnActivity'); if (a) a.onclick = function() { navigateToRoleActivity(); };
        const p = document.getElementById('navBtnProfile'); if (p) p.onclick = function() { logout(); };
      }
    }

    function showTab(tabName) {
      document.getElementById('tabTeacherClasses').classList.add('hidden');
      document.getElementById('tabTeacherDailyLogs').classList.add('hidden');
      document.getElementById('tabTeacherTraining').classList.add('hidden');

      ['bNavClasses', 'bNavDailyLogs', 'bNavTraining'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active-nav-item');
      });

      if (tabName === 'teacherClasses') {
        document.getElementById('tabTeacherClasses').classList.remove('hidden');
        const activeEl = document.getElementById('bNavClasses');
        if (activeEl) activeEl.classList.add('active-nav-item');
      }
      if (tabName === 'teacherDailyLogs') {
        document.getElementById('tabTeacherDailyLogs').classList.remove('hidden');
        const activeEl = document.getElementById('bNavDailyLogs');
        if (activeEl) activeEl.classList.add('active-nav-item');
        loadTeacherSubmissions();
      }
      if (tabName === 'teacherTraining') {
        document.getElementById('tabTeacherTraining').classList.remove('hidden');
        const activeEl = document.getElementById('bNavTraining');
        if (activeEl) activeEl.classList.add('active-nav-item');
        loadTeacherSchedules();
      }
      if (tabName === 'teacherDailyLogs') {
        loadTeacherSubmissions();
      }
    }

    // STUDENT DAILY LOG (5 AKTIVITI SEGAK)
    async function submitSingleActivityLog(actType) {
      const warmupCompleted = document.getElementById('logWarmup').checked;
      const curlUpReps = Number(document.getElementById('logCurlUp').value);
      const cardioDurationMinutes = Number(document.getElementById('logCardioMin').value);
      const cardioPulseOrReps = Number(document.getElementById('logCardioPulse').value);
      const pushUpReps = Number(document.getElementById('logPushUp').value);
      const sitReachCm = Number(document.getElementById('logSitReach').value);
      const notes = document.getElementById('logNotes').value;

      const payload = {
        logDate: new Date().toISOString().split('T')[0],
        warmupCompleted,
        curlUpReps,
        cardioDurationMinutes,
        cardioPulseOrReps,
        pushUpReps,
        sitReachCm,
        notes
      };

      const titles = {
        warmup: '1) Panaskan Badan',
        curlup: '2) Bangkit Tubi',
        cardio: '3) Latihan Kardio',
        pushup: '4) Tekan Tubi',
        sitreach: '5) Jangkauan Melunjur',
        notes: 'Catatan Latihan'
      };

      const res = await fetch('/api/student/daily-log', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert(\`Log \${titles[actType] || 'Aktiviti'} Berjaya Dihantar!\`);
        loadStudentDailyLogs();
      }
    }

    async function submitStudentDailyLog(e) {
      e.preventDefault();
      await submitSingleActivityLog('semua');
    }

    async function loadStudentDailyLogs() {
      const container = document.getElementById('studentDailyLogHistory');
      if (!container) return;
      const res = await fetch('/api/student/daily-log', {
        headers: { 'Authorization': 'Bearer ' + currentToken }
      });
      const data = await res.json();
      if (!data.success || !data.data || data.data.length === 0) {
        container.innerHTML = '<p class="text-slate-400 text-center py-2">Belum ada rekod harian yang disimpan.</p>';
        return;
      }

      container.innerHTML = data.data.map(l => \`
        <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
          <div class="flex justify-between items-center">
            <span class="font-bold text-slate-900">\${l.logDate}</span>
            <span class="text-[9px] font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full">Disimpan</span>
          </div>
          <div class="grid grid-cols-2 gap-1 text-[10px] text-slate-700 pt-0.5">
            <div>Warm-up: <b>\${l.warmupCompleted ? 'Selesai' : 'Tidak'}</b></div>
            <div>Bangkit: <b>\${l.curlUpReps} reps</b></div>
            <div>Kardio: <b>\${l.cardioDurationMinutes}m (\${l.cardioPulseOrReps})</b></div>
            <div>Tekan: <b>\${l.pushUpReps} reps</b></div>
            <div class="col-span-2">Jangkauan: <b>\${l.sitReachCm} cm</b></div>
          </div>
          \${l.notes ? \`<div class="text-[9px] text-slate-500 italic pt-0.5">"\${l.notes}"</div>\` : ''}
        </div>
      \`).join('');
    }

    async function loadStudentAssignments() {
      const container = document.getElementById('studentAssignmentList');
      if (!container) return;
      const res = await fetch('/api/student/assignments', { headers: { 'Authorization': 'Bearer ' + currentToken } });
      const data = await res.json();
      if (!data.success || !data.data?.length) {
        container.innerHTML = '<p class="text-xs text-slate-400 text-center py-3">Tiada latihan diberikan buat masa ini.</p>';
        return;
      }
      container.innerHTML = data.data.sort((a, b) => String(a.trainingDate).localeCompare(String(b.trainingDate))).map(assignment => {
        const done = ['submitted', 'approved'].includes(assignment.status);
        return \`
          <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div class="flex justify-between gap-2"><div><div class="font-bold text-xs text-slate-900">\${assignment.title}</div><div class="text-[10px] text-slate-500">Tarikh latihan: \${formatDate(assignment.trainingDate)}</div></div><span class="shrink-0 text-[9px] font-bold px-2 py-1 rounded-full \${done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">\${done ? 'Selesai' : 'Belum selesai'}</span></div>
            \${assignment.instructions ? \`<p class="text-[10px] text-slate-600">\${assignment.instructions}</p>\` : ''}
            <button onclick="openStudentAssignment(\${JSON.stringify(assignment).replace(/"/g, '&quot;')})" class="w-full py-1.5 bg-slate-900 text-white rounded-md text-[11px] font-semibold \${done ? 'opacity-60' : ''}">\${done ? 'Lihat latihan' : 'Buka & tandakan selesai'}</button>
          </div>
        \`;
      }).join('');
    }

    function youtubeEmbedUrl(url) {
      try {
        const parsedUrl = new URL(url);
        let videoId = '';
        if (parsedUrl.hostname === 'youtu.be' || parsedUrl.hostname === 'www.youtu.be') videoId = parsedUrl.pathname.slice(1).split('/')[0];
        else if (parsedUrl.hostname === 'youtube.com' || parsedUrl.hostname === 'www.youtube.com') videoId = parsedUrl.searchParams.get('v') || parsedUrl.pathname.split('/').filter(Boolean).pop();
        return videoId ? 'https://www.youtube.com/embed/' + videoId : '';
      } catch (_) {
        return '';
      }
    }

    function openStudentAssignment(assignment) {
      document.getElementById('submitTrainingTitle').textContent = assignment.title;
      document.getElementById('submitTrainingInstructions').textContent = assignment.instructions || 'Sila siapkan semua aktiviti yang diberikan.';
      document.getElementById('submitAssignmentId').value = assignment.assignmentId;
      document.getElementById('submitScheduleId').value = assignment.scheduleId;
      document.getElementById('submitTrainingNotes').value = '';
      /*
      document.getElementById('submitTrainingActivities').innerHTML = (assignment.activities || []).map(activity => \`<div class="p-2 bg-slate-50 rounded border border-slate-200 text-[10px]"><b>\${activity.title}</b><span class="text-slate-500"> · \${activity.sets || 1} set\${activity.reps ? \` x \${activity.reps} ulangan\` : ''}</span></div>\`).join('');
      */
      document.getElementById('submitTrainingActivities').innerHTML = (assignment.activities || []).map((activity, index) => { const embedUrl = youtubeEmbedUrl(activity.videoUrl || ''); return '<div class="space-y-2"><div class="text-xs font-bold text-slate-900">Aktiviti ' + (index + 1) + '</div>' + (embedUrl ? '<div class="w-full aspect-video min-h-[220px] sm:min-h-[420px] md:min-h-[560px] overflow-hidden rounded-xl bg-slate-900"><iframe class="w-full h-full border-0" src="' + embedUrl + '?rel=0&playsinline=1" title="Video latihan ' + (index + 1) + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div><a href="' + activity.videoUrl + '" target="_blank" rel="noopener noreferrer" class="inline-block text-xs text-emerald-700 underline">Buka di YouTube jika video tidak dimainkan</a>' : '<p class="text-xs text-amber-700">Link YouTube tidak sah.</p>') + '</div>'; }).join('');
      toggleModal('modalSubmitTraining', true);
    }

    async function submitTrainingAssignment() {
      const res = await fetch('/api/student/submissions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: Number(document.getElementById('submitAssignmentId').value), scheduleId: Number(document.getElementById('submitScheduleId').value), studentNotes: document.getElementById('submitTrainingNotes').value })
      });
      const data = await res.json();
      if (!data.success) return alert(data.message || 'Gagal menghantar latihan.');
      toggleModal('modalSubmitTraining', false);
      await loadStudentAssignments();
      alert('Latihan berjaya ditandakan sebagai selesai.');
    }

    window.openStudentAssignment = openStudentAssignment;
    window.submitTrainingAssignment = submitTrainingAssignment;

    // TEACHER LOGIC
    async function loadTeacherClasses() {
      const container = document.getElementById('classListContainer');
      const res = await fetch('/api/teacher/classes', {
        headers: { 'Authorization': 'Bearer ' + currentToken }
      });
      const data = await res.json();
      if (data.success) {
        populateDailyLogClassOptions(data.data);
        populateScheduleClassOptions(data.data);
      }
      if (!data.success || data.data.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400 text-center">Tiada kelas didaftarkan.</p>';
        return;
      }
      container.innerHTML = data.data.map(c => \`
        <div onclick="selectClass(\${c.id}, '\${c.name}')" class="p-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg cursor-pointer transition flex justify-between items-center">
          <div>
            <div class="font-bold text-xs text-slate-900">\${c.name}</div>
            <div class="text-[10px] text-slate-500">Lihat senarai murid</div>
          </div>
          <span class="text-xs text-slate-400">âž”</span>
        </div>
      \`).join('');
    }

    function populateDailyLogClassOptions(classes) {
      const select = document.getElementById('dailyLogClassSelect');
      if (!select) return;
      const currentValue = select.value;
      select.innerHTML = '<option value="">Pilih kelas</option>' + classes.map(c => \`<option value="\${c.id}">\${c.name}</option>\`).join('');
      if (currentValue && classes.some(c => String(c.id) === currentValue)) select.value = currentValue;
    }

    async function loadTeacherDailyLogClasses() {
      const select = document.getElementById('dailyLogClassSelect');
      if (!select || select.options.length > 1) return;
      const res = await fetch('/api/teacher/classes', {
        headers: { 'Authorization': 'Bearer ' + currentToken }
      });
      const data = await res.json();
      if (data.success) populateDailyLogClassOptions(data.data);
    }

    async function loadTeacherDailyLogs() {
      const classId = document.getElementById('dailyLogClassSelect')?.value;
      const date = document.getElementById('dailyLogDate')?.value;
      const container = document.getElementById('dailyLogStudentList');
      if (!classId || !date) {
        container.innerHTML = '<p class="text-xs text-slate-400 text-center py-3">Pilih kelas dan tarikh untuk melihat rekod.</p>';
        return;
      }

      container.innerHTML = '<p class="text-xs text-slate-400 text-center py-3">Memuatkan status murid...</p>';
      const res = await fetch(\`/api/teacher/classes/\${classId}/daily-logs?date=\${date}\`, {
        headers: { 'Authorization': 'Bearer ' + currentToken }
      });
      const data = await res.json();
      if (!data.success) {
        container.innerHTML = \`<p class="text-xs text-red-500 text-center py-3">\${data.message || 'Gagal memuatkan rekod.'}</p>\`;
        return;
      }

      document.getElementById('dailyLogTotal').textContent = data.data.summary.total;
      document.getElementById('dailyLogCompleted').textContent = data.data.summary.completed;
      document.getElementById('dailyLogNotCompleted').textContent = data.data.summary.notCompleted;
      document.getElementById('dailyLogClassName').textContent = data.data.class.name;
      document.getElementById('dailyLogSelectedDate').textContent = 'Tarikh: ' + data.data.date;

      if (data.data.students.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400 text-center py-3">Tiada murid dalam kelas ini.</p>';
        return;
      }

      container.innerHTML = data.data.students.map(student => {
        const completed = student.status === 'completed';
        const log = student.log;
        return \`
          <details class="group p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <summary class="list-none cursor-pointer flex items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="font-bold text-xs text-slate-900 truncate">\${student.fullName}</div>
                <div class="text-[10px] text-slate-500">ID: \${student.studentIdNum} Â· \${student.gender === 'L' ? 'Lelaki' : 'Perempuan'}</div>
              </div>
              <span class="shrink-0 text-[10px] font-bold px-2 py-1 rounded-full \${completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">\${completed ? 'Sudah buat' : 'Belum buat'}</span>
            </summary>
            \${completed ? \`<div class="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 gap-1 text-[10px] text-slate-700">
              <div>Warm-up: <b>\${log.warmupCompleted ? 'Selesai' : 'Tidak'}</b></div>
              <div>Bangkit tubi: <b>\${log.curlUpReps ?? 0} reps</b></div>
              <div>Kardio: <b>\${log.cardioDurationMinutes ?? 0} min</b></div>
              <div>Nadi/ulangan: <b>\${log.cardioPulseOrReps ?? 0}</b></div>
              <div>Tekan tubi: <b>\${log.pushUpReps ?? 0} reps</b></div>
              <div>Jangkauan: <b>\${log.sitReachCm ?? 0} cm</b></div>
              \${log.notes ? \`<div class="col-span-2 text-slate-500 italic pt-1">Catatan: "\${log.notes}"</div>\` : ''}
            </div>\` : '<div class="mt-2 text-[10px] text-slate-500">Murid belum menghantar rekod untuk tarikh ini.</div>'}
          </details>
        \`;
      }).join('');
    }

    async function selectClass(classId, className) {
      activeClassId = classId;
      document.getElementById('currentClassName').textContent = 'Murid ' + className;
      document.getElementById('studentListSection').classList.remove('hidden');

      const container = document.getElementById('studentCardsContainer');
      const res = await fetch(\`/api/teacher/classes/\${classId}/students\`, {
        headers: { 'Authorization': 'Bearer ' + currentToken }
      });
      const data = await res.json();
      if (!data.success || data.data.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400 text-center py-2">Tiada murid dalam kelas ini.</p>';
        return;
      }

      container.innerHTML = data.data.map(s => \`
        <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center text-xs">
          <div>
            <div class="font-bold text-slate-900">\${s.fullName}</div>
            <div class="text-[10px] text-slate-500">ID: \${s.studentIdNum} | Jantina: \${s.gender}</div>
          </div>
          <button onclick="resetPassword(\${s.studentUserId})" class="text-[10px] text-slate-700 font-semibold bg-white px-2 py-1 rounded-md border border-slate-300 hover:bg-slate-100">
            Reset Pass
          </button>
        </div>
      \`).join('');
    }

    function populateScheduleClassOptions(classes) {
      const select = document.getElementById('scheduleClassId');
      if (!select) return;
      const currentValue = select.value;
      select.innerHTML = '<option value="">Pilih kelas</option>' + classes.map(c => '<option value="' + c.id + '">' + c.name + '</option>').join('');
      if (currentValue && classes.some(c => String(c.id) === currentValue)) select.value = currentValue;
    }

    function formatDate(date) {
      if (!date) return '-';
      return new Date(date + 'T00:00:00').toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    async function loadTeacherSchedules() {
      const container = document.getElementById('trainingScheduleList');
      if (!container) return;
      const res = await fetch('/api/teacher/schedules', { headers: { 'Authorization': 'Bearer ' + currentToken } });
      const data = await res.json();
      if (!data.success || !data.data?.length) {
        container.innerHTML = '<p class="text-xs text-slate-400 text-center py-3">Belum ada latihan diberikan.</p>';
        return;
      }
      /*
      container.innerHTML = data.data.map(schedule => \`
        <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
          <div class="flex justify-between gap-2"><span class="font-bold text-xs text-slate-900">\${schedule.title}</span><span class="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">\${schedule.status === 'published' ? 'Diterbitkan' : schedule.status}</span></div>
          <div class="text-[10px] text-slate-500">Tarikh latihan: <b>${formatDate(schedule.trainingDate)}</b> · Tarikh akhir: <b>${formatDate(schedule.dueDate)}</b></div>
          <div class="text-[10px] text-slate-500">Kelas ID: \${schedule.classId}</div>
          \${schedule.instructions ? \`<p class="text-[10px] text-slate-600 pt-1">\${schedule.instructions}</p>\` : ''}
        </div>
      \`).join('');
      */
      container.innerHTML = data.data.map(schedule => '<div class="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1"><div class="font-bold text-xs text-slate-900">' + schedule.title + '</div><div class="text-[10px] text-slate-500">Tarikh latihan: ' + formatDate(schedule.trainingDate) + '</div><div class="text-[10px] text-slate-500">Kelas ID: ' + schedule.classId + '</div>' + (schedule.instructions ? '<p class="text-[10px] text-slate-600 pt-1">' + schedule.instructions + '</p>' : '') + '</div>').join('');
    }

    async function handleCreateSchedule(e) {
      e.preventDefault();
      const lines = document.getElementById('scheduleActivities').value.split(/\\r?\\n/).map(line => line.trim()).filter(Boolean);
      if (!lines.length) return alert('Sila masukkan sekurang-kurangnya satu aktiviti.');
      const activities = lines.map((linkText, index) => {
        try {
          const parsedUrl = new URL(linkText);
          if (!['youtube.com', 'www.youtube.com', 'youtu.be', 'www.youtu.be'].includes(parsedUrl.hostname)) throw new Error('not-youtube');
          return { title: 'Video Latihan ' + (index + 1), sets: 1, reps: null, videoUrl: linkText };
        } catch (_) {
          return null;
        }
      });
      if (activities.some(activity => !activity)) return alert('Semua aktiviti mesti menggunakan link YouTube yang sah.');
      const res = await fetch('/api/teacher/schedules', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: Number(document.getElementById('scheduleClassId').value), title: document.getElementById('scheduleTitle').value, trainingDate: document.getElementById('scheduleTrainingDate').value, instructions: document.getElementById('scheduleInstructions').value, activities })
      });
      const data = await res.json();
      if (!data.success) return alert(data.message || 'Gagal menerbitkan latihan.');
      toggleModal('modalCreateSchedule', false);
      e.target.reset();
      await loadTeacherSchedules();
      alert('Latihan berjaya diberikan kepada murid dalam kelas.');
    }

    async function loadTeacherSubmissions() {
      const container = document.getElementById('teacherSubmissionList');
      if (!container) return;
      const res = await fetch('/api/teacher/submissions', { headers: { 'Authorization': 'Bearer ' + currentToken } });
      const data = await res.json();
      if (!data.success || !data.data?.length) {
        container.innerHTML = '<p class="text-xs text-slate-400 text-center py-3">Belum ada murid menghantar latihan.</p>';
        return;
      }
      /*
      container.innerHTML = data.data.map(item => \`
        <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between gap-2 items-start"><div><div class="font-bold text-xs text-slate-900">${item.studentName}</div><div class="text-[10px] text-slate-500">${item.scheduleTitle} · ${formatDate(item.submissionDate?.slice(0, 10))}</div>${item.studentNotes ? `<div class="text-[10px] text-slate-600 pt-1">Catatan: ${item.studentNotes}</div>` : ''}</div><span class="shrink-0 text-[9px] font-bold px-2 py-1 rounded-full ${item.reviewStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}">${item.reviewStatus === 'approved' ? 'Diluluskan' : 'Dihantar'}</span></div>
      \`).join('');
    }

      */
      container.innerHTML = data.data.map(item => '<div class="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between gap-2 items-start"><div><div class="font-bold text-xs text-slate-900">' + item.studentName + '</div><div class="text-[10px] text-slate-500">' + item.scheduleTitle + ' - ' + formatDate(item.submissionDate?.slice(0, 10)) + '</div>' + (item.studentNotes ? '<div class="text-[10px] text-slate-600 pt-1">Catatan: ' + item.studentNotes + '</div>' : '') + '</div><span class="shrink-0 text-[9px] font-bold px-2 py-1 rounded-full ' + (item.reviewStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700') + '">' + (item.reviewStatus === 'approved' ? 'Diluluskan' : 'Dihantar') + '</span></div>').join('');
    }

    async function handleCreateClass(e) {
      e.preventDefault();
      const name = document.getElementById('newClassName').value;
      const res = await fetch('/api/teacher/classes', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: 1, academicSessionId: 1, name })
      });
      const data = await res.json();
      if (data.success) {
        toggleModal('modalCreateClass', false);
        loadTeacherClasses();
      }
    }

    async function handleAddStudent(e) {
      e.preventDefault();
      if (!activeClassId) return alert('Sila pilih kelas terlebih dahulu');
      const studentIdNum = document.getElementById('addStudentIdNum').value;
      const fullName = document.getElementById('addStudentName').value;
      const gender = document.getElementById('addStudentGender').value;
      const dob = document.getElementById('addStudentDob').value;

      const res = await fetch('/api/teacher/students', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: 1, classId: activeClassId, studentIdNum, fullName, gender, dob })
      });
      const data = await res.json();
      if (data.success) {
        toggleModal('modalAddStudent', false);
        selectClass(activeClassId, '');
      }
    }

    async function resetPassword(userId) {
      if (!confirm('Reset kata laluan murid ke Murid1234!?')) return;
      await fetch('/api/teacher/students/reset-password', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword: 'Murid1234!' })
      });
      alert('Kata laluan murid berjaya direset.');
    }

    // SEGAK SESSION & RESULTS LOGIC
    async function loadTeacherSegakSessions() {
      const container = document.getElementById('segakSessionList');
      const res = await fetch('/api/segak/sessions', {
        headers: { 'Authorization': 'Bearer ' + currentToken }
      });
      const data = await res.json();
      if (!data.success || data.data.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400 text-center">Tiada sesi SEGAK.</p>';
        return;
      }
      container.innerHTML = data.data.map(s => \`
        <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
          <div class="font-bold text-xs text-slate-900">\${s.title}</div>
          <div class="text-[10px] text-slate-500">Tarikh: \${s.assessmentDate} | \${s.phase}</div>
          <button onclick="openSegakScoreEntry(\${s.id}, '\${s.title}')" class="w-full py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md">
            Isi Skor Murid
          </button>
        </div>
      \`).join('');
    }

    async function handleCreateSegakSession(e) {
      e.preventDefault();
      const title = document.getElementById('segakSessionTitle').value;
      const phase = document.getElementById('segakSessionPhase').value;
      const assessmentDate = document.getElementById('segakSessionDate').value;

      const res = await fetch('/api/segak/sessions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: 1, academicSessionId: 1, classId: 1, title, phase, assessmentDate })
      });
      const data = await res.json();
      if (data.success) {
        toggleModal('modalCreateSegakSession', false);
        loadTeacherSegakSessions();
      }
    }

    async function openSegakScoreEntry(sessionId, sessionTitle) {
      document.getElementById('activeSessionTitle').textContent = 'Skor: ' + sessionTitle;
      document.getElementById('segakScoreEntrySection').classList.remove('hidden');

      const resStudents = await fetch('/api/teacher/classes/1/students', { headers: { 'Authorization': 'Bearer ' + currentToken } });
      const dataStudents = await resStudents.json();

      const resResults = await fetch(\`/api/segak/sessions/\${sessionId}/results\`, { headers: { 'Authorization': 'Bearer ' + currentToken } });
      const dataResults = await resResults.json();
      const resultMap = {};
      (dataResults.data || []).forEach(r => { resultMap[r.studentId] = r; });

      const container = document.getElementById('mobileSegakScoreList');
      container.innerHTML = dataStudents.data.map(s => {
        const r = resultMap[s.studentUserId] || {};
        return \`
          <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
            <div class="font-bold text-slate-900 border-b border-slate-200 pb-1">\${s.fullName} (\${s.gender})</div>
            <div class="grid grid-cols-2 gap-2">
              <div><label class="text-[10px] text-slate-500 font-semibold block">Tinggi (cm):</label><input type="number" id="height_\${s.studentUserId}" value="\${r.heightCm || s.heightCm || 138}" class="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"></div>
              <div><label class="text-[10px] text-slate-500 font-semibold block">Berat (kg):</label><input type="number" id="weight_\${s.studentUserId}" value="\${r.weightKg || s.weightKg || 34}" class="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"></div>
              <div><label class="text-[10px] text-slate-500 font-semibold block">Naik Turun Bangku:</label><input type="number" id="step_\${s.studentUserId}" value="100" class="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"></div>
              <div><label class="text-[10px] text-slate-500 font-semibold block">Tekan Tubi:</label><input type="number" id="push_\${s.studentUserId}" value="15" class="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"></div>
              <div><label class="text-[10px] text-slate-500 font-semibold block">Ringkuk Tubi:</label><input type="number" id="curl_\${s.studentUserId}" value="12" class="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"></div>
              <div><label class="text-[10px] text-slate-500 font-semibold block">Jangkauan (cm):</label><input type="number" id="reach_\${s.studentUserId}" value="25" class="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"></div>
            </div>
            <button onclick="saveStudentSegakScore(\${sessionId}, \${s.studentUserId}, '\${s.gender}')" class="w-full py-1.5 bg-slate-900 text-white rounded-md font-semibold text-xs mt-1">
              Simpan & Kira Skor
            </button>
            \${r.totalScore ? \`<div class="text-center font-bold text-slate-800 text-[11px]">Skor: \${r.totalScore} (\${r.overallGrade})</div>\` : ''}
          </div>
        \`;
      }).join('');
    }

    async function saveStudentSegakScore(sessionId, studentId, gender) {
      const heightCm = Number(document.getElementById(\`height_\${studentId}\`).value);
      const weightKg = Number(document.getElementById(\`weight_\${studentId}\`).value);
      const step = Number(document.getElementById(\`step_\${studentId}\`).value);
      const push = Number(document.getElementById(\`push_\${studentId}\`).value);
      const curl = Number(document.getElementById(\`curl_\${studentId}\`).value);
      const reach = Number(document.getElementById(\`reach_\${studentId}\`).value);

      const payload = {
        sessionId,
        studentId,
        heightCm,
        weightKg,
        age: 11,
        gender,
        measurements: [
          { activityCode: 'BMI', rawMeasurement: 0 },
          { activityCode: 'STEP_TEST', rawMeasurement: step },
          { activityCode: 'PUSH_UP', rawMeasurement: push },
          { activityCode: 'CURL_UP', rawMeasurement: curl },
          { activityCode: 'SIT_REACH', rawMeasurement: reach }
        ]
      };

      const res = await fetch('/api/segak/results', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert(\`Skor Dikira!\\nJumlah Skor: \${data.data.totalScore}\\nGred: \${data.data.overallGrade}\\nBMI: \${data.data.bmiCategory}\`);
      }
    }

    async function loadStudentSegakResults() {
      const container = document.getElementById('studentSegakSummary');
      if (!container) return;
      const res = await fetch('/api/student/segak-results', {
        headers: { 'Authorization': 'Bearer ' + currentToken }
      });
      const data = await res.json();
      if (!data.success || !data.data || data.data.length === 0) {
        container.innerHTML = '<p class="text-slate-400 text-center py-2">Keputusan Ujian SEGAK belum direkodkan oleh guru.</p>';
        return;
      }

      container.innerHTML = data.data.map(r => \`
        <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-xs">
          <div class="font-bold text-slate-900">\${r.sessionTitle}</div>
          <div class="text-slate-500 text-[10px]">Tarikh: \${r.assessmentDate}</div>
          <div class="text-slate-700">Tinggi: <b>\${r.heightCm} cm</b> | Berat: <b>\${r.weightKg} kg</b></div>
          <div class="text-slate-700">BMI: <b>\${r.calculatedBmi}</b> (\${r.bmiCategory})</div>
          <div class="text-slate-900 font-extrabold text-xs pt-0.5">Jumlah Skor: \${r.totalScore} / 20 (\${r.overallGrade})</div>
        </div>
      \`).join('');
    }

    // ADMIN LOGIC
    async function loadAdminData() {
      const schoolList = document.getElementById('adminSchoolList');
      const res = await fetch('/api/admin/schools', {
        headers: { 'Authorization': 'Bearer ' + currentToken }
      });
      const data = await res.json();
      if (!data.success) return;

      schoolList.innerHTML = data.data.map(s => \`
        <div class="p-3 bg-slate-50 border rounded-lg flex justify-between items-center text-xs">
          <div>
            <div class="font-bold text-slate-900">\${s.name}</div>
            <div class="text-slate-500 text-[10px]">Kod: \${s.code} | \${s.state}</div>
          </div>
        </div>
      \`).join('');
    }
  </script>
</body>
</html>`
