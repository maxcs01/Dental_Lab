/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  Phone,
  MapPin,
  Plus,
  Search,
  Trash2,
  Edit2,
  X,
  ArrowLeft,
  Check,
  Calendar,
  DollarSign,
  AlertCircle,
  Bell,
  Settings,
  LayoutDashboard,
  CheckCircle2,
  TrendingUp,
  FileText,
  ChevronRight,
  User,
  Info,
  CalendarDays,
  RotateCcw,
  Lock,
  Key,
  LogOut,
  Mail,
  UserPlus,
  ShieldAlert
} from 'lucide-react';
import { Dentist, Job, HistoryRecord } from './types';
import { DEFAULT_DENTISTS, DEFAULT_JOBS, DEFAULT_HISTORY } from './data';
import {
  isSupabaseConfigured,
  supabase,
  fetchRemoteData,
  syncLocalDataToSupabase,
  saveDentistRemote,
  deleteDentistRemote,
  saveJobRemote,
  deleteJobRemote,
  saveHistoryRecordRemote,
  deleteHistoryRecordRemote,
  signUpWithSupabaseAuth,
  signInWithSupabaseAuth,
  signOutWithSupabaseAuth,
  signInWithGoogleAuth
} from './supabase';

export default function App() {
  // --- Authentication States ---
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('dentlab_logged_in') === 'true';
  });

  const [currentUserEmail, setCurrentUserEmail] = useState<string>(() => {
    return localStorage.getItem('dentlab_current_user_email') || '';
  });

  const [accounts, setAccounts] = useState<{ email: string; password: string; securityQuestion: string; securityAnswer: string }[]>(() => {
    const saved = localStorage.getItem('dentlab_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        // Fallback
      }
    }
    const defaultAccounts = [
      { 
        email: 'odontologo@precisao.com', 
        password: 'senha123', 
        securityQuestion: 'Qual seu primeiro laboratorio?', 
        securityAnswer: 'precisao' 
      }
    ];
    localStorage.setItem('dentlab_users', JSON.stringify(defaultAccounts));
    return defaultAccounts;
  });

  // Active subview: 'login' | 'register' | 'recover' | 'recovery-revealed'
  const [authView, setAuthView] = useState<'login' | 'register' | 'recover' | 'recovery-revealed'>('login');

  // Input states
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  
  // Registration input states
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regSecurityQuestion, setRegSecurityQuestion] = useState('Qual seu primeiro laboratorio?');
  const [regSecurityAnswer, setRegSecurityAnswer] = useState('');
  
  // Recovery input states
  const [recoverEmailInput, setRecoverEmailInput] = useState('');
  const [selectedRecoveryAccount, setSelectedRecoveryAccount] = useState<{ email: string; securityQuestion: string; password?: string } | null>(null);
  const [recoveryAnswerInput, setRecoveryAnswerInput] = useState('');
  const [recoveredPasswordReady, setRecoveredPasswordReady] = useState('');
  
  // Display alerts
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Save accounts to localStorage
  useEffect(() => {
    localStorage.setItem('dentlab_users', JSON.stringify(accounts));
  }, [accounts]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const emailNormalized = authEmail.toLowerCase().trim();

    if (isSupabaseConfigured) {
      setIsSupabaseSyncing(true);
      try {
        // Authenticate authentic credentials utilizing standard Supabase Auth
        await signInWithSupabaseAuth(emailNormalized, authPassword);

        // Sync local cache for recovery details if needed locally
        const target = {
          email: emailNormalized,
          password: authPassword,
          securityQuestion: 'Qual seu primeiro laboratorio?',
          securityAnswer: 'precisao',
        };

        setAccounts(prev => {
          const index = prev.findIndex(a => a.email.toLowerCase().trim() === emailNormalized);
          if (index === -1) {
            return [...prev, target];
          } else {
            const copy = [...prev];
            copy[index] = { ...copy[index], password: authPassword };
            return copy;
          }
        });

        // Successful authentication
        setIsLoggedIn(true);
        setCurrentUserEmail(emailNormalized);
        localStorage.setItem('dentlab_logged_in', 'true');
        localStorage.setItem('dentlab_current_user_email', emailNormalized);
        setAuthEmail('');
        setAuthPassword('');
        return;
      } catch (err: any) {
        console.error('Supabase application signIn error:', err);
        setAuthError(`Falha no login com Supabase Auth: ${err?.message || 'E-mail ou senha incorretos.'}`);
        return;
      } finally {
        setIsSupabaseSyncing(false);
      }
    }

    // Fallback locally if Supabase is not configured
    const target = accounts.find(
      (a) => a.email.toLowerCase().trim() === emailNormalized
    );

    if (!target) {
      setAuthError('E-mail não cadastrado no sistema.');
      return;
    }

    if (target.password !== authPassword) {
      setAuthError('Senha incorreta.');
      return;
    }

    // Success local login
    setIsLoggedIn(true);
    setCurrentUserEmail(target.email);
    localStorage.setItem('dentlab_logged_in', 'true');
    localStorage.setItem('dentlab_current_user_email', target.email);
    setAuthEmail('');
    setAuthPassword('');
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!regEmail.trim() || !regPassword.trim() || !regSecurityAnswer.trim()) {
      setAuthError('Preencha todos os campos obrigatórios.');
      return;
    }

    const emailNormalized = regEmail.toLowerCase().trim();
    const newAcc = {
      email: emailNormalized,
      password: regPassword,
      securityQuestion: regSecurityQuestion,
      securityAnswer: regSecurityAnswer.trim().toLowerCase(),
    };

    if (isSupabaseConfigured) {
      setIsSupabaseSyncing(true);
      try {
        // Core authentication registration using standard Supabase Auth
        await signUpWithSupabaseAuth(emailNormalized, regPassword);
      } catch (err: any) {
        console.error('Supabase Auth register failed:', err);
        let customMsg = err?.message || 'Erro ao registrar credenciais no Supabase.';
        if (customMsg.includes('should be at least') || customMsg.toLowerCase().includes('password')) {
          customMsg = 'A senha no Supabase deve ter pelo menos 6 caracteres.';
        } else if (customMsg.includes('Signup is disabled')) {
          customMsg = 'O cadastro de novos e-mails está desativado nas definições do seu provedor de autenticação do Supabase.';
        }
        setAuthError(`Impossível cadastrar nova conta no Supabase Auth: ${customMsg}`);
        setIsSupabaseSyncing(false);
        return;
      } finally {
        setIsSupabaseSyncing(false);
      }
    } else {
      // Local uniqueness check if not configured
      if (accounts.some((a) => a.email.toLowerCase().trim() === emailNormalized)) {
        setAuthError('Este e-mail já está cadastrado localmente.');
        return;
      }
    }

    // Store in state and save locally
    const nextAccounts = [...accounts, newAcc];
    setAccounts(nextAccounts);
    
    setAuthSuccess(isSupabaseConfigured 
      ? 'Conta criada e autenticada no Supabase Postgres com sucesso! Você já pode realizar o seu login.' 
      : 'Conta criada localmente com sucesso! Faça login abaixo.'
    );
    setAuthView('login');
    setAuthEmail(emailNormalized);
    setAuthPassword(regPassword);
    
    // reset inputs
    setRegEmail('');
    setRegPassword('');
    setRegSecurityAnswer('');
  };

  const handleStartRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const emailNormalized = recoverEmailInput.toLowerCase().trim();
    const target = accounts.find((a) => a.email.toLowerCase().trim() === emailNormalized);

    if (!target) {
      setAuthError('E-mail não cadastrado neste navegador.');
      return;
    }

    setSelectedRecoveryAccount(target);
    setRecoveryAnswerInput('');
    setRecoveredPasswordReady('');
    setAuthView('recovery-revealed');
  };

  const handleVerifyAnswerAndReveal = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!selectedRecoveryAccount) return;

    const answerNormalized = recoveryAnswerInput.trim().toLowerCase();
    
    // Find matching live account structure
    const fullAcc = accounts.find(a => a.email.toLowerCase().trim() === selectedRecoveryAccount.email.toLowerCase().trim());

    if (!fullAcc) {
      setAuthError('Erro ao buscar conta.');
      return;
    }

    if (fullAcc.securityAnswer === answerNormalized) {
      setRecoveredPasswordReady(fullAcc.password);
      setAuthSuccess('Resposta confirmada com sucesso! Senha recuperada.');
    } else {
      setAuthError('Resposta de segurança incorreta.');
    }
  };

  const handleLogout = () => {
    if (isSupabaseConfigured) {
      signOutWithSupabaseAuth().catch(err => console.error(err));
    }
    setIsLoggedIn(false);
    setCurrentUserEmail('');
    localStorage.removeItem('dentlab_logged_in');
    localStorage.removeItem('dentlab_current_user_email');
    setAuthView('login');
    setAuthError('');
    setAuthSuccess('');
  };

  // --- Persistent State ---
  const [dentists, setDentists] = useState<Dentist[]>(() => {
    const user = localStorage.getItem('dentlab_current_user_email') || '';
    const emailKey = user ? `_${user.toLowerCase().trim()}` : '';
    const saved = localStorage.getItem(`dentlab_dentists${emailKey}`);
    return saved ? JSON.parse(saved) : (user ? [] : DEFAULT_DENTISTS);
  });

  const [jobs, setJobs] = useState<Job[]>(() => {
    const user = localStorage.getItem('dentlab_current_user_email') || '';
    const emailKey = user ? `_${user.toLowerCase().trim()}` : '';
    const saved = localStorage.getItem(`dentlab_jobs${emailKey}`);
    return saved ? JSON.parse(saved) : (user ? [] : DEFAULT_JOBS);
  });

  const [history, setHistory] = useState<HistoryRecord[]>(() => {
    const user = localStorage.getItem('dentlab_current_user_email') || '';
    const emailKey = user ? `_${user.toLowerCase().trim()}` : '';
    const saved = localStorage.getItem(`dentlab_history${emailKey}`);
    return saved ? JSON.parse(saved) : (user ? [] : DEFAULT_HISTORY);
  });

  // Load user data whenever currentUserEmail changes
  useEffect(() => {
    const emailKey = currentUserEmail ? `_${currentUserEmail.toLowerCase().trim()}` : '';
    
    const savedDentists = localStorage.getItem(`dentlab_dentists${emailKey}`);
    const savedJobs = localStorage.getItem(`dentlab_jobs${emailKey}`);
    const savedHistory = localStorage.getItem(`dentlab_history${emailKey}`);
    
    if (savedDentists) {
      setDentists(JSON.parse(savedDentists));
    } else {
      setDentists(currentUserEmail ? [] : DEFAULT_DENTISTS);
    }
    
    if (savedJobs) {
      setJobs(JSON.parse(savedJobs));
    } else {
      setJobs(currentUserEmail ? [] : DEFAULT_JOBS);
    }
    
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    } else {
      setHistory(currentUserEmail ? [] : DEFAULT_HISTORY);
    }
  }, [currentUserEmail]);

  // Save to localStorage
  useEffect(() => {
    const emailKey = currentUserEmail ? `_${currentUserEmail.toLowerCase().trim()}` : '';
    localStorage.setItem(`dentlab_dentists${emailKey}`, JSON.stringify(dentists));
  }, [dentists, currentUserEmail]);

  useEffect(() => {
    const emailKey = currentUserEmail ? `_${currentUserEmail.toLowerCase().trim()}` : '';
    localStorage.setItem(`dentlab_jobs${emailKey}`, JSON.stringify(jobs));
  }, [jobs, currentUserEmail]);

  useEffect(() => {
    const emailKey = currentUserEmail ? `_${currentUserEmail.toLowerCase().trim()}` : '';
    localStorage.setItem(`dentlab_history${emailKey}`, JSON.stringify(history));
  }, [history, currentUserEmail]);

  // --- Supabase Integrations & State ---
  const [isSupabaseSyncing, setIsSupabaseSyncing] = useState<boolean>(false);
  const [supabaseErrorState, setSupabaseErrorState] = useState<string | null>(null);
  const [supabaseSuccessMsg, setSupabaseSuccessMsg] = useState<string | null>(null);
  const [supabaseDiagnostic, setSupabaseDiagnostic] = useState<{ 
    status: 'loading' | 'connected' | 'error' | 'not_configured'; 
    message?: string;
  }>({ status: 'loading' });

  // Listen to Supabase Auth state changes (useful for Google OAuth logins and page refreshes)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setIsLoggedIn(true);
        setCurrentUserEmail(session.user.email);
        localStorage.setItem('dentlab_logged_in', 'true');
        localStorage.setItem('dentlab_current_user_email', session.user.email);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.email) {
        setIsLoggedIn(true);
        setCurrentUserEmail(session.user.email);
        localStorage.setItem('dentlab_logged_in', 'true');
        localStorage.setItem('dentlab_current_user_email', session.user.email);
      } else if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false);
        setCurrentUserEmail('');
        localStorage.removeItem('dentlab_logged_in');
        localStorage.removeItem('dentlab_current_user_email');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // On mount, perform complete diagnostic checks against public dentists database
  useEffect(() => {
    async function runDiagnostics() {
      if (!isSupabaseConfigured) {
        setSupabaseDiagnostic({
          status: 'not_configured',
          message: 'As variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não estão definidas.'
        });
        return;
      }
      try {
        const { data, error } = await supabase!
          .from('dentists')
          .select('id')
          .limit(1);

        if (error) {
          throw error;
        }

        setSupabaseDiagnostic({
          status: 'connected',
          message: `Conexão estabelecida com sucesso! Acesso verificado ao banco de dados Supabase (tabela 'dentists').`
        });
      } catch (err: any) {
        console.error('Erro de diagnóstico Supabase:', err);
        let msg = err?.message || 'Erro de conexão ou resposta inválida.';
        if (err?.code === 'PGRST116' || msg.includes('does not exist')) {
          msg = '⚠️ Tabela "dentists" não encontrada! Você executou as migrations no seu painel Supabase? Abra o editor SQL do Supabase e cole o script localizado no arquivo /supabase/migrations/ para inicializar as tabelas.';
        } else if (msg.includes('API key') || msg.includes('JWT')) {
          msg = '⚠️ Chave de API Anônima ou URL Supabase incorreta ou inválida no painel de segredos.';
        }
        setSupabaseDiagnostic({
          status: 'error',
          message: msg
        });
      }
    }
    runDiagnostics();
  }, []);

  // Auto-load accounts and clinical data on login or mount
  useEffect(() => {
    async function loadFromSupabase() {
      if (!isSupabaseConfigured) return;
      setIsSupabaseSyncing(true);
      setSupabaseErrorState(null);
      try {
        // If logged in, fetch live clinical data
        if (isLoggedIn) {
          const remoteData = await fetchRemoteData(currentUserEmail);
          if (remoteData) {
            setDentists(remoteData.dentists);
            setJobs(remoteData.jobs);
            setHistory(remoteData.history);
          }
        }
      } catch (err: any) {
        console.error('Supabase auto load failed:', err);
        setSupabaseErrorState('Não foi possível sincronizar os dados com o Supabase. Usando cópia persistida local.');
      } finally {
        setIsSupabaseSyncing(false);
      }
    }

    loadFromSupabase();
  }, [isLoggedIn]);

  // Handle manual hard sync: Push local data to the cloud
  const handleUploadLocalToSupabase = async () => {
    if (!isSupabaseConfigured) {
      alert('Supabase não configurado no .env.');
      return;
    }
    setIsSupabaseSyncing(true);
    setSupabaseErrorState(null);
    setSupabaseSuccessMsg(null);
    try {
      // Sync tables
      const ok = await syncLocalDataToSupabase(dentists, jobs, history, currentUserEmail);
      if (ok) {
        setSupabaseSuccessMsg('Dados locais enviados com sucesso para o banco Supabase!');
        alert('Dados sincronizados com o Supabase com sucesso!');
      } else {
        throw new Error('Sync returned false.');
      }
    } catch (err: any) {
      console.error('Sync to Supabase failed:', err);
      setSupabaseErrorState('Erro ao enviar dados locais para o Supabase.');
    } finally {
      setIsSupabaseSyncing(false);
    }
  };

  // Handle manual download: Pull fresh cloud data
  const handleDownloadFromSupabase = async () => {
    if (!isSupabaseConfigured) {
      alert('Supabase não configurado no .env.');
      return;
    }
    setIsSupabaseSyncing(true);
    setSupabaseErrorState(null);
    setSupabaseSuccessMsg(null);
    try {
      const remoteData = await fetchRemoteData(currentUserEmail);
      if (remoteData) {
        setDentists(remoteData.dentists);
        setJobs(remoteData.jobs);
        setHistory(remoteData.history);
        setSupabaseSuccessMsg('Dados do Supabase importados com sucesso!');
        alert('Dados importados do Supabase com sucesso!');
      } else {
        throw new Error('Supabase retornou vazio.');
      }
    } catch (err: any) {
      console.error('Failed downloading from Supabase:', err);
      setSupabaseErrorState('Erro ao carregar dados remotos.');
    } finally {
      setIsSupabaseSyncing(false);
    }
  };

  // --- Date & Time Context ---
  // Default current virtual time to 2026-05-22 as specified in system metadata
  const [currentDateString, setCurrentDateString] = useState('2026-05-22');
  
  // Track active tab and selected Dentist ID for deep-dive profiles
  const [activeTab, setActiveTab] = useState<'dashboard' | 'dentistas' | 'ajustes'>('dashboard');
  const [selectedDentistId, setSelectedDentistId] = useState<string | null>(null);

  // Search terms
  const [dentistSearchQuery, setDentistSearchQuery] = useState('');
  const [jobFilter, setJobFilter] = useState<'todos' | 'pendentes' | 'pagos'>('todos');

  // --- Modals State ---
  const [showAddDentist, setShowAddDentist] = useState(false);
  const [showEditDentist, setShowEditDentist] = useState(false);
  const [showAddJob, setShowAddJob] = useState(false);
  const [showEditJob, setShowEditJob] = useState(false);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [showHistorySearch, setShowHistorySearch] = useState(false);
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false);
  const [showTodayJobs, setShowTodayJobs] = useState(false);

  // Currently viewing/editing objects
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobToPayId, setJobToPayId] = useState<string | null>(null);

  // --- Form Controlled Inputs ---
  // 1. Add Dentist
  const [newDentistName, setNewDentistName] = useState('');
  const [newDentistAddress, setNewDentistAddress] = useState('');
  const [newDentistPhone, setNewDentistPhone] = useState('');

  // 2. Edit Dentist (includes manual overrides & delete)
  const [editDentistName, setEditDentistName] = useState('');
  const [editDentistAddress, setEditDentistAddress] = useState('');
  const [editDentistPhone, setEditDentistPhone] = useState('');
  const [useManualTotals, setUseManualTotals] = useState(false);
  const [manualTotalReceber, setManualTotalReceber] = useState(0);
  const [manualTotalRecebido, setManualTotalRecebido] = useState(0);

  // 3. Add Job
  const [newJobPatient, setNewJobPatient] = useState('');
  const [newJobType, setNewJobType] = useState('');
  const [newJobPrice, setNewJobPrice] = useState(0);
  const [newJobDateType, setNewJobDateType] = useState<'inicio' | 'entrega'>('entrega');
  const [newJobDate, setNewJobDate] = useState('2026-05-22');
  const [newJobNotes, setNewJobNotes] = useState('');

  // 4. Edit Job
  const [editJobPatient, setEditJobPatient] = useState('');
  const [editJobType, setEditJobType] = useState('');
  const [editJobPrice, setEditJobPrice] = useState(0);
  const [editJobDateType, setEditJobDateType] = useState<'inicio' | 'entrega'>('entrega');
  const [editJobDate, setEditJobDate] = useState('2026-05-22');
  const [editJobNotes, setEditJobNotes] = useState('');

  // 5. Payment status parameters
  const [paymentDateInput, setPaymentDateInput] = useState('2026-05-22');

  // 6. History parameters
  const [searchHistoryMonth, setSearchHistoryMonth] = useState(5); // May
  const [searchHistoryYear, setSearchHistoryYear] = useState(2026);
  const [historyResult, setHistoryResult] = useState<{
    calculated: boolean;
    totalReceber: number;
    totalRecebido: number;
    jobsPaidCount: number;
    jobsPendingCount: number;
  } | null>(null);

  // --- Formatting Helpers ---
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const formatDateBrazilian = (dateStr: string) => {
    if (!dateStr) return 'Sem data';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const getMonthName = (monthNum: number) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[monthNum - 1] || '';
  };

  // --- Calculations ---

  // Get current year and month from Virtual Calendar Date DateString (e.g. "2026-05-22" -> y: 2026, m: 5)
  const currentYear = useMemo(() => {
    return parseInt(currentDateString.split('-')[0], 10);
  }, [currentDateString]);

  const currentMonth = useMemo(() => {
    return parseInt(currentDateString.split('-')[1], 10);
  }, [currentDateString]);

  // Total a receber (unpaid) per dentist helper
  const getDentistPendingTotal = (dentist: Dentist) => {
    if (dentist.useManualTotals && dentist.manualTotalReceber !== undefined) {
      return dentist.manualTotalReceber;
    }
    return jobs
      .filter(j => j.dentistId === dentist.id && !j.isPaid)
      .reduce((sum, j) => sum + j.price, 0);
  };

  // Total recebido per dentist helper
  const getDentistReceivedTotal = (dentist: Dentist) => {
    if (dentist.useManualTotals && dentist.manualTotalRecebido !== undefined) {
      return dentist.manualTotalRecebido;
    }
    return jobs
      .filter(j => j.dentistId === dentist.id && j.isPaid)
      .reduce((sum, j) => sum + j.price, 0);
  };

  // 1. "valor que todos os odontólogos em conjunto me têm que pagar" (Total unpaid balance from everyone)
  const totalGeneralA_Receber = useMemo(() => {
    return dentists.reduce((sum, dentist) => sum + getDentistPendingTotal(dentist), 0);
  }, [dentists, jobs]);

  // 2. "valor total recebido este mês, que se atualiza a cada mês"
  // Recalculates dynamically based on the current virtual month & year
  const totalRecebidoEsteMes = useMemo(() => {
    // Collect from jobs paid within this month of the virtual calendar
    const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const paidJobsThisMonth = jobs.filter(j => j.isPaid && j.paymentDate && j.paymentDate.startsWith(monthPrefix));
    
    // Sum of paid jobs this month
    const jobsTotal = paidJobsThisMonth.reduce((sum, j) => sum + j.price, 0);

    // Also include dentists with manual overrides for total received if they have useManualTotals enabled
    // Note: fallback or add as needed. To be mathematically clean, we prioritize real job sums + manual totals
    let manualSum = 0;
    dentists.forEach(d => {
      if (d.useManualTotals && d.manualTotalRecebido !== undefined) {
        // If dentist uses manual override, we assume it's their general received total.
        // For active monthly view let's keep jobs strictly accurate, but support manual adjustments. 
        // We'll show the dynamic jobs sum or total manual input.
      }
    });

    return jobsTotal;
  }, [jobs, currentYear, currentMonth]);

  // 3. "um número correspondente de pacientes que não pagarão hoje"
  // Count of pending (unpaid) job entries where the date (start or delivery as chosen) is scheduled for TODAY!
  const pendingJobsToday = useMemo(() => {
    return jobs.filter(j => !j.isPaid && j.date === currentDateString);
  }, [jobs, currentDateString]);

  const pendingJobsTodayCount = pendingJobsToday.length;

  // Selected Dentist object
  const selectedDentist = useMemo(() => {
    return dentists.find(d => d.id === selectedDentistId) || null;
  }, [dentists, selectedDentistId]);

  // Filtered jobs list of selected dentist
  const dentistJobs = useMemo(() => {
    if (!selectedDentistId) return [];
    let list = jobs.filter(j => j.dentistId === selectedDentistId);
    if (jobFilter === 'pendentes') {
      return list.filter(j => !j.isPaid);
    } else if (jobFilter === 'pagos') {
      return list.filter(j => j.isPaid);
    }
    return list;
  }, [jobs, selectedDentistId, jobFilter]);

  // Filtered Dentist list for Search on Homepage
  const filteredDentists = useMemo(() => {
    const q = dentistSearchQuery.toLowerCase().trim();
    if (!q) return dentists;
    return dentists.filter(
      d => d.name.toLowerCase().includes(q) || d.address.toLowerCase().includes(q)
    );
  }, [dentists, dentistSearchQuery]);

  // --- Handlers & Actions ---

  // Add Dentist
  const handleAddDentist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDentistName.trim()) return;

    const newDentist: Dentist = {
      id: 'dent_' + Date.now(),
      name: newDentistName.trim(),
      address: newDentistAddress.trim() || 'Sem endereço cadastrado',
      phone: newDentistPhone.trim() || 'Sem telefone',
      useManualTotals: false,
    };

    setDentists([...dentists, newDentist]);
    if (isSupabaseConfigured) {
      saveDentistRemote(newDentist, currentUserEmail).catch(err => console.error('Supabase save error:', err));
    }
    
    // Reset fields
    setNewDentistName('');
    setNewDentistAddress('');
    setNewDentistPhone('');
    setShowAddDentist(false);
  };

  // Open Edit Dentist Modal with loaded data
  const openEditDentistModal = (dentist: Dentist) => {
    setEditDentistName(dentist.name);
    setEditDentistAddress(dentist.address);
    setEditDentistPhone(dentist.phone);
    setUseManualTotals(dentist.useManualTotals);
    setManualTotalReceber(dentist.manualTotalReceber || 0);
    setManualTotalRecebido(dentist.manualTotalRecebido || 0);
    setShowEditDentist(true);
  };

  // Save Dentist changes
  const handleEditDentist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDentistId) return;

    let updated: Dentist | null = null;
    setDentists(prev => prev.map(d => {
      if (d.id === selectedDentistId) {
        const u = {
          ...d,
          name: editDentistName,
          address: editDentistAddress,
          phone: editDentistPhone,
          useManualTotals,
          manualTotalReceber,
          manualTotalRecebido,
        };
        updated = u;
        return u;
      }
      return d;
    }));

    if (updated && isSupabaseConfigured) {
      saveDentistRemote(updated, currentUserEmail).catch(err => console.error('Supabase save error:', err));
    }

    setShowEditDentist(false);
  };

  // Delete Dentist (Excluir) and clean up their jobs
  const handleDeleteDentist = () => {
    if (!selectedDentistId) return;
    if (confirm('Tem certeza de que deseja apagar este odontólogo? Todos os trabalhos vinculados também serão excluídos.')) {
      if (isSupabaseConfigured) {
        deleteDentistRemote(selectedDentistId, currentUserEmail).catch(err => console.error('Supabase delete error:', err));
      }
      setDentists(prev => prev.filter(d => d.id !== selectedDentistId));
      setJobs(prev => prev.filter(j => j.dentistId !== selectedDentistId));
      setSelectedDentistId(null);
      setShowEditDentist(false);
    }
  };

  // Add Job
  const handleAddJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDentistId || !newJobType.trim()) return;

    const newJob: Job = {
      id: 'job_' + Date.now(),
      dentistId: selectedDentistId,
      patientName: newJobPatient.trim() || 'Paciente Geral',
      jobName: newJobType.trim(),
      price: Number(newJobPrice) || 0,
      dateType: newJobDateType,
      date: newJobDate || '2026-05-22',
      notes: newJobNotes.trim(),
      isPaid: false,
    };

    setJobs([newJob, ...jobs]);
    if (isSupabaseConfigured) {
      saveJobRemote(newJob, currentUserEmail).catch(err => console.error('Supabase save error:', err));
    }

    // Reset fields
    setNewJobPatient('');
    setNewJobType('');
    setNewJobPrice(0);
    setNewJobDate('2026-05-22');
    setNewJobNotes('');
    setShowAddJob(false);
  };

  // Trigger Edit Job
  const openEditJobModal = (job: Job) => {
    setSelectedJob(job);
    setEditJobPatient(job.patientName);
    setEditJobType(job.jobName);
    setEditJobPrice(job.price);
    setEditJobDateType(job.dateType);
    setEditJobDate(job.date);
    setEditJobNotes(job.notes);
    setShowJobDetails(false);
    setShowEditJob(true);
  };

  // Save Edits for Job
  const handleEditJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    let updated: Job | null = null;
    setJobs(prev => prev.map(j => {
      if (j.id === selectedJob.id) {
        const u = {
          ...j,
          patientName: editJobPatient.trim() || 'Paciente Geral',
          jobName: editJobType.trim(),
          price: Number(editJobPrice) || 0,
          dateType: editJobDateType,
          date: editJobDate,
          notes: editJobNotes,
        };
        updated = u;
        return u;
      }
      return j;
    }));

    if (updated && isSupabaseConfigured) {
      saveJobRemote(updated, currentUserEmail).catch(err => console.error('Supabase save error:', err));
    }

    setShowEditJob(false);
    setSelectedJob(null);
  };

  // Delete specific job (Apagar trabalho)
  const handleDeleteJob = (jobId: string) => {
    if (confirm('Tem certeza de que deseja remover este trabalho permanentemente?')) {
      if (isSupabaseConfigured) {
        deleteJobRemote(jobId, currentUserEmail).catch(err => console.error('Supabase delete error:', err));
      }
      setJobs(prev => prev.filter(j => j.id !== jobId));
      setShowJobDetails(false);
      setShowEditJob(false);
      setSelectedJob(null);
    }
  };

  // Toggle paid status switch (abrir / apagar flutuante)
  // Decoupled toggle which behaves as requested:
  // "um botão de abrir/apagar flutuante que... se estiver desligado... mostra 'Pendiente' ... se for ativado, vai perguntar a data de pagamento"
  const handleToggleJobPayment = (job: Job, checked: boolean) => {
    if (checked) {
      // Open popup asking date of payment
      setJobToPayId(job.id);
      setPaymentDateInput(currentDateString); // pre-populate with system virtual date
      setShowPaymentPrompt(true);
    } else {
      // Transitioning to unpaid directly
      const updatedJob = { ...job, isPaid: false, paymentDate: undefined };
      setJobs(prev => prev.map(j => {
        if (j.id === job.id) {
          return updatedJob;
        }
        return j;
      }));
      if (isSupabaseConfigured) {
        saveJobRemote(updatedJob, currentUserEmail).catch(err => console.error('Supabase save error:', err));
      }
    }
  };

  // Confirm payment registration with date input
  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobToPayId) return;

    let updatedJob: Job | null = null;
    setJobs(prev => prev.map(j => {
      if (j.id === jobToPayId) {
        const u = {
          ...j,
          isPaid: true,
          paymentDate: paymentDateInput || currentDateString,
        };
        updatedJob = u;
        return u;
      }
      return j;
    }));

    if (updatedJob && isSupabaseConfigured) {
      saveJobRemote(updatedJob, currentUserEmail).catch(err => console.error('Supabase save error:', err));
    }

    setShowPaymentPrompt(false);
    setJobToPayId(null);
  };

  // Search History handler (allows lookup of chosen month and year)
  const handleSearchHistory = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if there is an existing explicit history record saved
    const savedRecord = history.find(h => h.month === searchHistoryMonth && h.year === searchHistoryYear);

    // Calculate dynamically from jobs of that month and year
    const monthPrefix = `${searchHistoryYear}-${String(searchHistoryMonth).padStart(2, '0')}`;
    const paidJobsInPeriod = jobs.filter(j => j.isPaid && j.paymentDate && j.paymentDate.startsWith(monthPrefix));
    
    // Unpaid jobs scheduled for that month
    const pendingJobsInPeriod = jobs.filter(j => !j.isPaid && j.date.startsWith(monthPrefix));

    const calTotalReceber = pendingJobsInPeriod.reduce((sum, j) => sum + j.price, 0);
    const calTotalRecebido = paidJobsInPeriod.reduce((sum, j) => sum + j.price, 0);

    setHistoryResult({
      calculated: !savedRecord,
      totalReceber: savedRecord ? savedRecord.totalReceber : calTotalReceber,
      totalRecebido: savedRecord ? savedRecord.totalRecebido : calTotalRecebido,
      jobsPaidCount: paidJobsInPeriod.length,
      jobsPendingCount: pendingJobsInPeriod.length,
    });
  };

  // Seed / Reset Database function to default values
  const handleResetDatabase = () => {
    if (confirm('Deseja redefinir todo o banco de dados para os dados padrão do laboratório? Isso apagará as suas ações recentes.')) {
      setDentists(DEFAULT_DENTISTS);
      setJobs(DEFAULT_JOBS);
      setHistory(DEFAULT_HISTORY);
      setSelectedDentistId(null);
      setCurrentDateString('2026-05-22');
      alert('Banco de dados redefinido com sucesso!');
    }
  };

  // Trigger quick transition to profiles from anywhere
  const viewDentistProfile = (dentistId: string) => {
    setSelectedDentistId(dentistId);
    setActiveTab('dentistas');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-start p-2 sm:p-6 select-none font-sans">
      
      <div className="w-full max-w-lg mb-4 text-center">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
          Clinical Precision System <span className="bg-sky-600/30 text-sky-400 text-[10px] px-2 py-0.5 rounded-full border border-sky-500/20">V2.4</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Feito sob medida para gestão financeira de laboratórios biológicos e dentários.
        </p>
      </div>

      {/* Clean full-scale fluid application card container */}
      <div className="w-full max-w-4xl min-h-[800px] rounded-2xl shadow-xl relative overflow-hidden bg-slate-50 text-slate-900 flex flex-col">
        
        {!isLoggedIn ? (
          /* ==========================================
             AUTHENTICATION FLOW PANELS
             ========================================== */
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-100 relative">
            
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-fade-in flex flex-col">
              
              {/* Top visual brand header */}
              <div className="bg-slate-950 p-6 text-white text-center select-none relative">
                <div className="absolute right-3 top-3 bg-teal-500/20 text-[#4fdbcc] text-[9px] px-2.5 py-0.5 rounded font-bold uppercase tracking-wide border border-teal-500/20">
                  Acesso Seguro
                </div>
                <div className="w-12 h-12 bg-sky-800 rounded-xl flex items-center justify-center text-white font-black text-xl mx-auto shadow-md border border-sky-600 mb-2">
                  DL
                </div>
                <h2 className="text-lg font-bold tracking-tight">DentLab Pro</h2>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-semibold">Tecnologia de Precisão Clínica</p>
              </div>

              {/* Status alerts */}
              {authError && (
                <div className="m-4 mb-0 p-3 bg-rose-50 border-l-4 border-rose-600 rounded text-xs text-rose-800 font-semibold flex items-start gap-2 animate-pulse">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="break-words select-text">{authError}</span>
                </div>
              )}

              {authSuccess && (
                <div className="m-4 mb-0 p-3 bg-teal-50 border-l-4 border-teal-600 rounded text-xs text-teal-800 font-semibold flex items-start gap-2">
                  <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <span className="break-words select-text">{authSuccess}</span>
                </div>
              )}

              {/* Subview Forms */}
              <div className="p-6">

                {authView === 'login' && (
                  <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
                    <div className="text-center space-y-1 mb-4 select-none">
                      <h3 className="text-sm font-bold text-slate-900">Identificação do Profissional</h3>
                      <p className="text-[11px] text-slate-400 font-medium">Informe suas credenciais para gerenciar faturamentos.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        E-mail Administrativo
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input 
                          type="email" 
                          required
                          placeholder="nome@exemplo.com"
                          className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-sky-850 focus:outline-none"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Senha Secreta
                        </label>
                        <button 
                          type="button"
                          onClick={() => {
                            setAuthError('');
                            setAuthSuccess('');
                            setAuthView('recover');
                          }}
                          className="text-[10.5px] text-sky-850 hover:underline font-bold cursor-pointer"
                        >
                          Esqueceu a senha?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input 
                          type="password" 
                          required
                          placeholder="••••••••"
                          className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-sky-850 focus:outline-none"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-3 bg-sky-850 hover:bg-sky-900 text-white font-bold rounded-lg cursor-pointer transition-all duration-150 text-[11px] uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5"
                    >
                      Acessar de Forma Segura
                    </button>

                    {isSupabaseConfigured && (
                      <div className="space-y-3 pt-1">
                        <div className="relative flex items-center justify-center">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                          </div>
                          <span className="relative px-3 bg-white text-slate-400 text-[10px] uppercase font-bold tracking-wide">Ou acesse com</span>
                        </div>

                        <button 
                          type="button"
                          onClick={async () => {
                            setAuthError('');
                            setAuthSuccess('');
                            try {
                              setIsSupabaseSyncing(true);
                              await signInWithGoogleAuth();
                            } catch (err: any) {
                              console.error('Google authorization error:', err);
                              setAuthError(`Não foi possível logar com Google: ${err?.message || 'Tente novamente.'}`);
                            } finally {
                              setIsSupabaseSyncing(false);
                            }
                          }}
                          className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-lg cursor-pointer transition-all duration-150 text-[11px] uppercase tracking-wider shadow-sm border border-slate-200 flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                          </svg>
                          Logar com Google
                        </button>
                      </div>
                    )}

                    <div className="text-center pt-2 select-none">
                      <p className="text-[11px] text-slate-400 font-medium">
                        Não possui acesso?{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setAuthError('');
                            setAuthSuccess('');
                            setAuthView('register');
                          }}
                          className="text-sky-850 hover:underline font-bold cursor-pointer"
                        >
                          Criar usuário
                        </button>
                      </p>
                    </div>


                  </form>
                )}

                {authView === 'register' && (
                  <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
                    <div className="text-center space-y-1 mb-4 select-none">
                      <h3 className="text-sm font-bold text-slate-900">Novo Cadastro Administrativo</h3>
                      <p className="text-[11px] text-slate-400">Insira suas credenciais e configure uma pergunta de segurança.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Seu E-mail Administrativo
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input 
                          type="email" 
                          required
                          placeholder="usuario@laboratorio.com"
                          className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-sky-850 focus:outline-none"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Sua Nova Senha Secreta
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input 
                          type="password" 
                          required
                          placeholder="Mínimo 4 caracteres"
                          className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-sky-850 focus:outline-none"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Pergunta para Recuperação de Senha
                      </label>
                      <select
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-sky-850 focus:outline-none"
                        value={regSecurityQuestion}
                        onChange={(e) => setRegSecurityQuestion(e.target.value)}
                      >
                        <option value="Qual seu primeiro laboratorio?">Qual seu primeiro laboratório?</option>
                        <option value="Nome do seu primeiro pet?">Nome do seu primeiro pet?</option>
                        <option value="Sua cidade de nascimento?">Sua cidade de nascimento?</option>
                        <option value="Nome da sua mae?">Nome da sua mãe?</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Resposta de Segurança (case-insensitive)
                      </label>
                      <input 
                        type="text" 
                        required
                        placeholder="Resposta para recuperação futura"
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-sky-850 focus:outline-none"
                        value={regSecurityAnswer}
                        onChange={(e) => setRegSecurityAnswer(e.target.value)}
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg cursor-pointer transition-all duration-150 text-[11px] uppercase tracking-wider shadow-sm"
                    >
                      Cadastrar e Sincronizar
                    </button>

                    <div className="text-center pt-1 select-none">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthError('');
                          setAuthSuccess('');
                          setAuthView('login');
                        }}
                        className="text-sky-850 hover:underline font-bold cursor-pointer"
                      >
                        Voltar para o Login
                      </button>
                    </div>
                  </form>
                )}

                {authView === 'recover' && (
                  <form onSubmit={handleStartRecovery} className="space-y-4 text-xs">
                    <div className="text-center space-y-1 mb-4 select-none">
                      <h3 className="text-sm font-bold text-slate-900">Buscar Conta do Laboratório</h3>
                      <p className="text-[11px] text-slate-400 animate-pulse">Informe o e-mail registrado para recuperar seu acesso.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        E-mail de Cadastro
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input 
                          type="email" 
                          required
                          placeholder="nome@exemplo.com"
                          className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-sky-850 focus:outline-none"
                          value={recoverEmailInput}
                          onChange={(e) => setRecoverEmailInput(e.target.value)}
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-3 bg-sky-850 hover:bg-sky-900 text-white font-bold rounded-lg cursor-pointer transition-all duration-150 text-[11px] uppercase tracking-wider shadow-sm"
                    >
                      Pesquisar Contas Ativas
                    </button>

                    <div className="text-center pt-1 select-none">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthError('');
                          setAuthSuccess('');
                          setAuthView('login');
                        }}
                        className="text-slate-500 hover:underline font-semibold cursor-pointer"
                      >
                        Voltar para o Login
                      </button>
                    </div>
                  </form>
                )}

                {authView === 'recovery-revealed' && selectedRecoveryAccount && (
                  <form onSubmit={handleVerifyAnswerAndReveal} className="space-y-4 text-xs">
                    <div className="text-center space-y-1 mb-4 select-none">
                      <h3 className="text-sm font-bold text-slate-900">Pergunta de Segurança</h3>
                      <p className="text-[12px] text-slate-600 font-mono truncate">{selectedRecoveryAccount.email}</p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 select-none">
                      <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wide">Pergunta Ativa:</span>
                      <strong className="text-xs text-slate-800">{selectedRecoveryAccount.securityQuestion}</strong>
                    </div>

                    {!recoveredPasswordReady ? (
                      <>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Sua Resposta de Segurança
                          </label>
                          <div className="relative">
                            <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                            <input 
                              type="text" 
                              required
                              placeholder="Digite a resposta configurada"
                              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-sky-850 focus:outline-none"
                              value={recoveryAnswerInput}
                              onChange={(e) => setRecoveryAnswerInput(e.target.value)}
                            />
                          </div>
                        </div>

                        <button 
                          type="submit"
                          className="w-full py-3 bg-sky-850 hover:bg-sky-900 text-white font-bold rounded-lg cursor-pointer transition-all duration-150 text-[11px] uppercase tracking-wider shadow-sm"
                        >
                          Verificar e Revelar Senha
                        </button>
                      </>
                    ) : (
                      <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-center space-y-3">
                        <span className="block text-[10px] uppercase font-bold text-teal-700">Senha Recuperada com Sucesso:</span>
                        <div className="inline-block bg-white border border-teal-200 px-4 py-2 rounded-lg text-sm font-mono font-black text-teal-950 select-all tracking-wider">
                          {recoveredPasswordReady}
                        </div>
                        <p className="text-[10.5px] text-teal-600 font-medium">Copie ou anote em local seguro para não perder novamente.</p>
                      </div>
                    )}

                    <div className="text-center pt-2 select-none">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthError('');
                          setAuthSuccess('');
                          setAuthView('login');
                          setSelectedRecoveryAccount(null);
                          setRecoveredPasswordReady('');
                        }}
                        className="text-sky-850 hover:underline font-bold cursor-pointer"
                      >
                        Ir para o Login
                      </button>
                    </div>
                  </form>
                )}

              </div>

            </div>

          </div>
        ) : (
          /* ==========================================
             LOGGED-IN APPLICATION VIEW
             ========================================== */
          <div className="w-full h-full flex flex-col pb-16 overflow-hidden relative flex-1">
          
          {/* TOP APP HEADER BAR */}
          <header className="h-[60px] border-b border-slate-200 flex items-center justify-between px-4 bg-white shrink-0 shadow-xs z-30">
            <div className="flex items-center gap-2">
              {/* Back key for drilling down dentist profile */}
              {selectedDentistId && (
                <button 
                  onClick={() => setSelectedDentistId(null)}
                  id="btn-back-to-list"
                  className="p-1 px-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer flex items-center gap-0.5 transition-all text-sm font-medium"
                >
                  <ArrowLeft className="w-4 h-4 text-sky-800" />
                  <span className="text-xs text-sky-800 font-semibold">Voltar</span>
                </button>
              )}
              {!selectedDentistId && (
                <div className="flex items-center gap-1.5">
                  <div className="w-7 h-7 rounded bg-sky-800 flex items-center justify-center text-white font-bold text-xs">
                    DL
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[14px] sm:text-[17px] font-bold text-slate-800 tracking-tight leading-none">DentLab Pro</span>
                    <span className={`text-[8px] font-extrabold uppercase tracking-wider mt-0.5 ${
                      isSupabaseConfigured ? 'text-teal-600' : 'text-amber-600 animate-pulse'
                    }`}>
                      {isSupabaseConfigured ? '☁️ Supabase Conectado' : '🔌 Supabase Local Sandbox'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Notification Badge + Icon at the top right header */}
            <div className="flex items-center gap-3">
              <div 
                onClick={() => setShowTodayJobs(true)}
                className="relative cursor-pointer hover:scale-105 active:scale-95 transition-all"
                title={`${pendingJobsTodayCount} trabalhos pendentes de hoje! Clique para ver tudo.`}
                id="btn-bell-notifications"
              >
                <div className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700">
                  <Bell className="w-4 h-4" />
                </div>
                {/* Badge showing "pacientes que não pagarão hoje" (pending works scheduled for today) */}
                {pendingJobsTodayCount > 0 && (
                  <span 
                    id="badge-alert-header"
                    className="absolute -top-1 -right-1 text-[10px] w-5 h-5 bg-red-600 text-white font-bold rounded-full flex items-center justify-center border-2 border-white shadow-md animate-pulse"
                  >
                    {pendingJobsTodayCount}
                  </span>
                )}
              </div>

              {/* Simple clock or calendar date display */}
              <div className="flex flex-col items-end text-[10px] font-mono text-slate-500">
                <span className="font-semibold text-slate-600">{formatDateBrazilian(currentDateString)}</span>
                <span>Sincronizado</span>
              </div>

              {/* Active User session & Logout (Sair) button */}
              <div className="flex items-center gap-2 border-l border-slate-200 pl-3.5">
                <div className="hidden sm:flex flex-col items-end text-[10px] text-slate-500 select-none">
                  <span className="font-bold text-slate-800 max-w-[130px] truncate" title={currentUserEmail}>
                    {currentUserEmail}
                  </span>
                  <span className="text-[8.5px] bg-[#4fdbcc]/20 border border-[#4fdbcc]/40 text-sky-900 rounded font-bold px-1.5 py-0.2 uppercase font-sans">
                    Painel
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sair / Trancar Painel"
                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100/40 cursor-pointer flex items-center justify-center transition-colors shadow-xs"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

          {/* APPLICATION MAIN SCROLLABLE CONTENT BODY */}
          <main className="flex-1 overflow-y-auto bg-slate-50/70 p-4 relative">
            
            {/* TABS SELECTOR LOGIC */}

            {/* TAB A: DASHBOARD VIEW */}
            {activeTab === 'dashboard' && !selectedDentistId && (
              <div className="space-y-4 animate-fade-in">
                
                {/* 2 & 3. CONSOLIDATED FINANCIAL DASHBOARD CARD - Merged to remove the separate second card component */}
                <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-sky-800"></div>
                  <div className="p-4 pl-5">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">A Receber em Conjunto</span>
                      <DollarSign className="w-4 h-4 text-sky-800" />
                    </div>
                    <h3 className="text-2xl font-bold font-mono tracking-tight text-slate-900 mt-1">
                      {formatCurrency(totalGeneralA_Receber)}
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Saldo acumulado de todos os odontólogos ativos no laboratório.
                    </p>

                    {/* Integrated monthly faturamento and history action */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Faturado em {getMonthName(currentMonth)}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-base font-bold text-teal-700 font-mono">
                            {formatCurrency(totalRecebidoEsteMes)}
                          </span>
                          <span className="bg-teal-100 text-teal-800 text-[8px] px-1 font-bold rounded">Pago</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setHistoryResult(null);
                          setShowHistorySearch(true);
                        }}
                        id="btn-ver-historico"
                        className="text-[11px] font-bold text-sky-800 hover:text-sky-900 cursor-pointer flex items-center gap-1 bg-sky-50 hover:bg-sky-100 border border-sky-100 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-sky-800" />
                        <span>Ver Histórico</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* QUICK OVERVIEW / ADJACENT WIDGET */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total de Clínicas</span>
                    <span className="text-xl font-bold block mt-1">{dentists.length}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide font-mono">Trabalhos Totais</span>
                    <span className="text-xl font-bold block mt-1">{jobs.length}</span>
                  </div>
                </div>

                {/* URGENT JOBS LISTING FOR TODAY */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Trabalhos Agendados para hoje ({formatDateBrazilian(currentDateString)})
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {jobs.filter(j => j.date === currentDateString).length} total
                    </span>
                  </div>

                  {jobs.filter(j => j.date === currentDateString).length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Nenhum trabalho agendado para o dia de hoje.</p>
                  ) : (
                    <div className="space-y-2">
                      {jobs.filter(j => j.date === currentDateString).map(job => {
                        const dr = dentists.find(d => d.id === job.dentistId);
                        return (
                          <div 
                            key={job.id} 
                            onClick={() => dr && viewDentistProfile(dr.id)}
                            className="p-2.5 rounded border border-slate-100 hover:border-slate-300 bg-slate-50 flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="text-xs font-semibold text-slate-900 line-clamp-1">{job.jobName}</span>
                              <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                                Paciente: <strong className="font-semibold text-slate-700">{job.patientName}</strong> • {dr?.name}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-bold text-slate-800 font-mono">{formatCurrency(job.price)}</span>
                              <div className="mt-0.5">
                                {job.isPaid ? (
                                  <span className="text-[9px] px-1.5 py-0.2 font-bold rounded bg-teal-100 text-teal-800">Pago</span>
                                ) : (
                                  <span className="text-[9px] px-1.5 py-0.2 font-bold rounded bg-amber-100 text-amber-800">Pendiente</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}


            {/* TAB B: DENTISTAS (LIST AND DRILL-DOWN PROFILES) */}
            {activeTab === 'dentistas' && !selectedDentistId && (
              <div className="space-y-4 animate-fade-in">
                
                {/* Search dentist bar & trigger button */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Buscar odontólogo pelo nome..."
                      value={dentistSearchQuery}
                      onChange={(e) => setDentistSearchQuery(e.target.value)}
                      className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 rounded bg-white shadow-xs focus:ring-1 focus:ring-sky-800 focus:outline-none"
                    />
                    {dentistSearchQuery && (
                      <button 
                        onClick={() => setDentistSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold px-1 hover:text-slate-600 cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* REQUISITO: BOTÃO ADICIONAR ODONTÓLOGOS */}
                  <button 
                    onClick={() => setShowAddDentist(true)}
                    id="btn-adicionar-dentista-topo"
                    className="p-2 bg-sky-800 text-white rounded hover:bg-sky-700 active:scale-95 transition-all text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add Dentista
                  </button>
                </div>

                {/* Dashboard Badge notifications inside Dentists List matching requirement: 
                    "na página principal da lista de odontólogos eu mostrarei uma notificação com um número correspondente de pacientes que não pagarão hoje." */}
                {pendingJobsTodayCount > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-900 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4.5 h-4.5 text-amber-700 shrink-0" />
                      <span>
                        Hoje: <strong className="font-bold text-amber-800">{pendingJobsTodayCount} paciente(s)</strong> ainda sem pagamento efetuado!
                      </span>
                    </div>
                    <span className="bg-amber-700 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Urgente
                    </span>
                  </div>
                )}

                {/* Dentists List card display */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Clínicas Parceiras ({filteredDentists.length})</h3>

                  {filteredDentists.length === 0 ? (
                    <div className="bg-white p-8 text-center rounded-lg border border-slate-200">
                      <User className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-medium text-slate-500">Nenhum odontólogo cadastrado ou encontrado.</p>
                      <button 
                        onClick={() => setShowAddDentist(true)}
                        className="text-xs text-sky-800 font-bold underline mt-1.5 inline-block cursor-pointer"
                      >
                        Adicionar novo perfil profissional
                      </button>
                    </div>
                  ) : (
                    filteredDentists.map(dentist => {
                      const dentistPending = getDentistPendingTotal(dentist);
                      const dentistReceived = getDentistReceivedTotal(dentist);
                      
                      // Count if this specific dentist has pending jobs with delivery date of today
                      const dentistUnpaidToday = jobs.filter(
                        j => j.dentistId === dentist.id && !j.isPaid && j.date === currentDateString
                      ).length;

                      return (
                        <div 
                          key={dentist.id}
                          onClick={() => setSelectedDentistId(dentist.id)}
                          className="bg-white rounded-xl border border-slate-200 p-4 hover:border-sky-800/40 hover:shadow-xs transition-all cursor-pointer group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex gap-3">
                              <div className="w-10 h-10 rounded-lg bg-sky-900/10 text-sky-800 flex items-center justify-center font-bold">
                                <Briefcase className="w-5 h-5 text-sky-800" />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-800 group-hover:text-sky-800 transition-colors">
                                  {dentist.name}
                                </h4>
                                <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  <span className="line-clamp-1">{dentist.address}</span>
                                </div>
                              </div>
                            </div>

                            {/* Unpaid today indicator block inside the dentist list */}
                            {dentistUnpaidToday > 0 && (
                              <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200">
                                {dentistUnpaidToday} Pendente Hoje
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-[11px]">
                            <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                              <span className="text-slate-500 block text-[9px] uppercase tracking-wide">Acumulado a Receber</span>
                              <span className="font-bold text-slate-900 font-mono mt-0.5 block">{formatCurrency(dentistPending)}</span>
                            </div>
                            <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                              <span className="text-slate-500 block text-[9px] uppercase tracking-wide">Acumulado Recebido</span>
                              <span className="font-bold text-emerald-800 font-mono mt-0.5 block">{formatCurrency(dentistReceived)}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end text-xs text-sky-800 font-bold mt-2 pt-1">
                            <span>Ver Perfil e Trabalhos</span>
                            <ChevronRight className="w-4 h-4 ml-0.5" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            )}


            {/* DENTIST DRILL DOWN PROFILE SUVPAGE VIEW */}
            {selectedDentistId && selectedDentist && (
              <div className="space-y-4 animate-fade-in pb-12">
                
                {/* 1. DENTIST HEADER CARD Matching Visual Layout from prompt image */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
                  <div className="absolute left-0 top-0 bottom-0 w-2 bg-sky-800"></div>
                  <div className="p-4 pl-5">
                    
                    <div className="flex items-start gap-4">
                      {/* Medical luggage icon wrapper */}
                      <div className="w-16 h-16 rounded-xl bg-sky-800 flex items-center justify-center text-white shrink-0 shadow-sm">
                        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                          <path d="M12 11v6" strokeLinecap="round" />
                          <path d="M9 14h6" strokeLinecap="round" />
                        </svg>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-bold text-slate-800 tracking-tight leading-tight">
                          {selectedDentist.name}
                        </h2>
                        
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="break-words line-clamp-2">{selectedDentist.address}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono">{selectedDentist.phone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Button trigger edit/delete dentist pop-up */}
                    <div className="flex items-center justify-start gap-3 mt-4 pt-3 border-t border-slate-100">
                      <button 
                        onClick={() => openEditDentistModal(selectedDentist)}
                        id="btn-editar-dentista"
                        className="py-1.5 px-3 bg-sky-900 border border-sky-800 text-white rounded text-xs font-semibold flex items-center gap-1 h-8 cursor-pointer hover:bg-sky-800 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Editar Dados
                      </button>

                      {selectedDentist.useManualTotals && (
                        <span className="text-[10px] bg-amber-50 text-amber-800 font-bold border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Info className="w-3 h-3" /> Totais Manuais Ativos
                        </span>
                      )}
                    </div>

                  </div>
                </div>

                {/* 2. FINANCIAL RESUMEE PANEL (TOTAL A RECEBER / TOTAL RECEBIDO) WITH EDITING WARNING & TOGGLE VIEW */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Resumo da Conta Clínica
                    </span>
                    <button
                      onClick={() => openEditDentistModal(selectedDentist)}
                      className="text-[10px] text-sky-800 font-bold hover:underline cursor-pointer"
                    >
                      Editar Valores
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-sky-50 p-3 rounded-lg border border-sky-100">
                      <span className="block text-[10px] font-bold text-sky-800 uppercase tracking-wider">
                        Total a Receber geral
                      </span>
                      <span className="text-lg font-bold font-mono block text-slate-900 mt-0.5">
                        {selectedDentist.useManualTotals && selectedDentist.manualTotalReceber !== undefined
                          ? formatCurrency(selectedDentist.manualTotalReceber)
                          : formatCurrency(jobs.filter(j => j.dentistId === selectedDentist.id && !j.isPaid).reduce((sum, j) => sum + j.price, 0))
                        }
                      </span>
                      <span className="text-[9px] text-slate-500 block mt-1">
                        {selectedDentist.useManualTotals ? 'Ajustado Manualmente' : 'Soma Automática'}
                      </span>
                    </div>

                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                      <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                        Total Recebido acumulado
                      </span>
                      <span className="text-lg font-bold font-mono block text-slate-900 mt-0.5">
                        {selectedDentist.useManualTotals && selectedDentist.manualTotalRecebido !== undefined
                          ? formatCurrency(selectedDentist.manualTotalRecebido)
                          : formatCurrency(jobs.filter(j => j.dentistId === selectedDentist.id && j.isPaid).reduce((sum, j) => sum + j.price, 0))
                        }
                      </span>
                      <span className="text-[9px] text-slate-500 block mt-1">
                        {selectedDentist.useManualTotals ? 'Ajustado Manualmente' : 'Soma Automática'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. WORKS SECTION HEADER AND FILTERS */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest banner">
                      Trabalhos Agendados ({dentistJobs.length})
                    </h3>
                    
                    {/* Add job button inside profile page */}
                    <button 
                      onClick={() => setShowAddJob(true)}
                      id="btn-agregar-trabalho"
                      className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Novo Trabalho
                    </button>
                  </div>

                  {/* Quick Filters */}
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                    {(['todos', 'pendentes', 'pagos'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setJobFilter(f)}
                        className={`flex-1 text-center text-xs py-1.5 rounded-md font-semibold cursor-pointer uppercase tracking-wider text-[10px] transition-all ${
                          jobFilter === f ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {f === 'todos' ? 'Todos' : f === 'pendentes' ? 'Pendientes' : 'Pagos'}
                      </button>
                    ))}
                  </div>

                  {/* 4. WORK LIST ITEMS COHERENT TO REQUIREMENTS:
                      "na lista de trabalhos da página do odontólogo, eu mostrarei o nome do tipo de trabalho, o preço e uma notificação dizendo que todavia não foi pago (escrito pendiente) ... esse botão para me ativar vai perguntar a data em que pagou..." */}
                  <div className="space-y-2.5 pt-1">
                    {dentistJobs.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">
                        Nenhum trabalho correspondente filtrado nesta clínica.
                      </p>
                    ) : (
                      dentistJobs.map(job => {
                        return (
                          <div 
                            key={job.id}
                            className="bg-slate-50 hover:bg-slate-100/80 p-3 rounded-lg border border-slate-200 flex flex-col justify-between gap-2.5 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              {/* Trigger detail pop-up on click to metadata */}
                              <div 
                                onClick={() => {
                                  setSelectedJob(job);
                                  setShowJobDetails(true);
                                }}
                                className="flex-1 cursor-pointer min-w-0 pr-3 group/job"
                              >
                                <span className="text-xs font-bold text-slate-800 block group-hover:text-sky-800 transition-colors line-clamp-1">
                                  {job.jobName}
                                </span>
                                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                                  <span className="font-medium text-slate-600">Paciente:</span>
                                  <span className="font-semibold text-slate-700 line-clamp-1">{job.patientName}</span>
                                </div>

                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  {job.dateType === 'inicio' ? 'Início: ' : 'Entrega: '} 
                                  <strong className="font-semibold">{formatDateBrazilian(job.date)}</strong>
                                </p>

                                {job.notes ? (
                                  <p className="text-[10px] text-slate-400 line-clamp-1 italic mt-1">
                                    "{job.notes}"
                                  </p>
                                ) : null}
                              </div>

                              {/* Price display */}
                              <div className="text-right shrink-0">
                                <span className="text-xs font-bold font-mono block text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded">
                                  {formatCurrency(job.price)}
                                </span>
                              </div>
                            </div>

                            {/* BOTTOM ACCENT: PAGO SWITCH / ABRIR-APAGAR FLUTUANTE REQUISITO */}
                            <div className="flex items-center justify-between border-t border-slate-200/60 pt-2.5">
                              {/* Left status badge identifier */}
                              <div>
                                {job.isPaid ? (
                                  <div className="flex flex-col items-start gap-0.5">
                                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Pago
                                    </span>
                                    {job.paymentDate && (
                                      <span className="text-[9px] text-slate-500 font-mono">
                                        em {formatDateBrazilian(job.paymentDate)}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    Pendiente
                                  </span>
                                )}
                              </div>

                              {/* On/Off Toggle Button Switch described as "botão de abrir/apagar flutuante que... ativa/desativa pagamento" */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-500 font-medium font-mono">
                                  {job.isPaid ? 'Marcar Pendente' : 'Marcar Pago'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleJobPayment(job, !job.isPaid)}
                                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-250 cursor-pointer flex items-center ${
                                    job.isPaid ? 'bg-teal-600' : 'bg-slate-300'
                                  }`}
                                  title={job.isPaid ? 'Desmarcar pagamento' : 'Registrar pagamento'}
                                >
                                  <div className={`bg-white w-4 h-4 rounded-full shadow-xs transform transition-transform duration-250 ${
                                    job.isPaid ? 'translate-x-6' : 'translate-x-0'
                                  }`} />
                                </button>
                              </div>
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Floating Action Button '+' inside profile view to add work */}
                <div className="absolute bottom-6 right-4 z-20">
                  <button 
                    onClick={() => setShowAddJob(true)}
                    id="btn-fab-agregar-trabalho"
                    className="w-14 h-14 rounded-full bg-sky-800 text-white shadow-lg flex items-center justify-center hover:bg-sky-700 active:scale-95 transition-all cursor-pointer border border-sky-900"
                    title="Adicionar Novo Trabalho"
                  >
                    <Plus className="w-7 h-7" />
                  </button>
                </div>

              </div>
            )}


            {/* TAB C: AJUSTES (VIRTUAL SIMULATION PARAMETERS) */}
            {activeTab === 'ajustes' && !selectedDentistId && (
              <div className="space-y-4 animate-fade-in">
                
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-slate-500" />
                    Configurações do Laboratório
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Gerencie a data de operação ativa, visualize as estatísticas do laboratório ou restaure o banco de dados para os valores originais.
                  </p>

                  {/* Operational active date identifier */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Data de Trabalho Ativa
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="date"
                        value={currentDateString}
                        onChange={(e) => {
                          if (e.target.value) {
                            setCurrentDateString(e.target.value);
                          }
                        }}
                        className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-sky-800 focus:outline-none"
                      />
                      <button 
                        onClick={() => setCurrentDateString('2026-05-22')}
                        className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold cursor-pointer flex items-center gap-1"
                        title="Resetar para hoje padrão (22/05/2026)"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Padrão
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Altere esta data para visualizar e processar trabalhos agendados em outros dias específicos de operação.
                    </span>
                  </div>

                  {/* Laboratory context details */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                    <span className="block font-bold text-slate-600 uppercase tracking-wider text-[10px]">Estatísticas do dia ({formatDateBrazilian(currentDateString)})</span>
                    <ul className="space-y-1.5 text-slate-600">
                      <li className="flex justify-between">
                        <span>Trabalhos agendados para hoje:</span>
                        <strong className="font-semibold font-mono">{jobs.filter(j => j.date === currentDateString).length}</strong>
                      </li>
                      <li className="flex justify-between">
                        <span>Trabalhos pendentes hoje:</span>
                        <strong className="font-semibold text-rose-600 font-mono">{pendingJobsTodayCount}</strong>
                      </li>
                      <li className="flex justify-between">
                        <span>Clínicas associadas ativas:</span>
                        <strong className="font-semibold font-mono">{dentists.length}</strong>
                      </li>
                    </ul>
                  </div>

                  {/* Base styling configuration indicator */}
                  <div className="p-3 bg-sky-900/5 rounded border border-sky-800/10 flex items-start gap-2">
                    <Info className="w-4 h-4 text-sky-800 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-sky-900">Configuração de Cores & Fontes</h4>
                      <p className="text-[10px] text-slate-600 mt-1">
                        Utilizando a paleta técnica **Clinical Precision System** com tipografia Inter para máxima visibilidade em ambientes laboratoriais esterilizados.
                      </p>
                    </div>
                  </div>

                  {/* Restore database option */}
                  <div className="pt-4 border-t border-rose-100">
                    <button 
                      onClick={handleResetDatabase}
                      className="w-full py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-rose-700" />
                      Apagar dados e reiniciar padrão
                    </button>
                  </div>

                </div>

                {/* Supabase Sync Panel */}
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-300 text-xs space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                      <span>⚡ Sincronização Nuvem Supabase</span>
                    </h4>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                      isSupabaseConfigured 
                        ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {isSupabaseConfigured ? 'Ativo & Conectado' : 'Modo Offline'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {isSupabaseConfigured 
                      ? 'Seu laboratório está conectado ao banco de dados relacional PostgreSQL do Supabase. Modificações em odontólogos, trabalhos e contas são sincronizadas em tempo real com a nuvem.' 
                      : 'O banco de dados do Supabase não está configurado. Suas ações estão protegidas em cache local. Para salvar em tempo real na nuvem Supabase, defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no painel de segredos.'
                    }
                  </p>

                  {supabaseErrorState && (
                    <div className="bg-rose-500/10 border border-rose-500/25 text-rose-300 p-2.5 rounded text-[10.5px]">
                      {supabaseErrorState}
                    </div>
                  )}

                  {supabaseSuccessMsg && (
                    <div className="bg-teal-500/10 border border-teal-500/25 text-teal-300 p-2.5 rounded text-[10.5px]">
                      {supabaseSuccessMsg}
                    </div>
                  )}

                  {isSupabaseConfigured && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={handleUploadLocalToSupabase}
                        disabled={isSupabaseSyncing}
                        className={`py-2 px-3 bg-sky-800 hover:bg-sky-700 text-white font-bold rounded uppercase tracking-wider text-[10px] cursor-pointer transition-colors text-center ${
                          isSupabaseSyncing ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        {isSupabaseSyncing ? 'Enviando...' : 'Enviar Local para Nuvem ☁️'}
                      </button>
                      <button
                        onClick={handleDownloadFromSupabase}
                        disabled={isSupabaseSyncing}
                        className={`py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded uppercase tracking-wider text-[10px] cursor-pointer transition-colors text-center ${
                          isSupabaseSyncing ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        {isSupabaseSyncing ? 'Baixando...' : 'Baixar da Nuvem 📥'}
                      </button>
                    </div>
                  )}

                  {!isSupabaseConfigured && (
                    <div className="bg-slate-950 p-2.5 rounded border border-slate-800/60 space-y-1 font-mono text-[9px] text-slate-500 select-text">
                      <div className="text-slate-400">-- MIGRATION SQL SCHEMA DISPONÍVEL --</div>
                      <div>Tabelas: dentists, jobs, history_records</div>
                      <div>Ver pasta: <span className="underline select-all">/supabase/migrations/</span></div>
                    </div>
                  )}
                </div>

                {/* Developer Stamp card */}
                <div className="bg-slate-800 p-3 rounded-xl text-slate-400 text-[10px] text-center border border-slate-700/60">
                  <p className="font-semibold text-slate-300">DentLab Pro Terminal V2.4</p>
                  <p className="mt-0.5">Sincronização Híbrida Inteligente (Cache Local + Nuvem Supabase Postgres)</p>
                </div>

              </div>
            )}

          </main>

          {/* APPLICATION FIXED BOTTOM NAVIGATION BAR Matching prompt image perfectly */}
          <nav className="h-[64px] border-t border-slate-200 bg-white flex items-center justify-around shrink-0 z-30 shadow-md">
            
            <button 
              onClick={() => {
                setSelectedDentistId(null);
                setActiveTab('dashboard');
              }}
              className={`flex-1 flex flex-col items-center justify-center h-full transition-colors cursor-pointer ${
                activeTab === 'dashboard' && !selectedDentistId ? 'text-sky-800 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 mb-1" />
              <span className="text-[10px] uppercase font-semibold tracking-wider">Dashboard</span>
            </button>

            {/* TAB DENTIST SELECTOR WITH HIGH SPOTLIGHT */}
            <div className="flex-1 h-full py-1.5 px-2 flex items-center justify-center">
              <button 
                onClick={() => {
                  setActiveTab('dentistas');
                  // Keep state clean but let them see dentists list if they click it
                }}
                className={`w-full py-1.5 px-3 rounded-full flex flex-col items-center justify-center transition-colors cursor-pointer ${
                  activeTab === 'dentistas' || selectedDentistId 
                    ? 'bg-[#4fdbcc]/20 text-sky-900 font-bold border border-[#4fdbcc]/50 shadow-xs' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {/* Visual medical brief icon */}
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                  <span className="text-[10px] uppercase font-semibold tracking-wider">Dentistas</span>
                </div>
              </button>
            </div>

            <button 
              onClick={() => {
                setSelectedDentistId(null);
                setActiveTab('ajustes');
              }}
              className={`flex-1 flex flex-col items-center justify-center h-full transition-colors cursor-pointer ${
                activeTab === 'ajustes' ? 'text-sky-800 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Settings className="w-5 h-5 mb-1" />
              <span className="text-[10px] uppercase font-semibold tracking-wider">Ajustes</span>
            </button>

          </nav>


          {/* =========================================================================
              MODAL INTERACTION DIALOG OVERLAYS
              ========================================================================= */}

          {/* 1. REQUISITO MODAL: ADICIONAR ODONTÓLOGOS POP-UP */}
          {showAddDentist && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-scale-up">
                <div className="bg-sky-800 p-4 flex items-center justify-between text-white">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    Cadastrar Dentista
                  </h3>
                  <button 
                    onClick={() => setShowAddDentist(false)}
                    className="p-1 rounded-full hover:bg-sky-700/55 cursor-pointer text-white"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                <form onSubmit={handleAddDentist} className="p-4 space-y-3.5 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                      Nome do Profissional / Clínica
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ex: Dr. Ricardo Silva"
                      required
                      value={newDentistName}
                      onChange={(e) => setNewDentistName(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded focus:ring-1 focus:ring-sky-850 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                      Endereço da Clínica
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ex: Av. das Américas, 4200 - RJ"
                      value={newDentistAddress}
                      onChange={(e) => setNewDentistAddress(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded focus:ring-1 focus:ring-sky-855 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                      Telefone / WhatsApp
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ex: (21) 98877-6655"
                      value={newDentistPhone}
                      onChange={(e) => setNewDentistPhone(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded focus:ring-1 focus:ring-sky-856 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button 
                      type="button" 
                      onClick={() => setShowAddDentist(false)}
                      className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded font-semibold cursor-pointer text-center"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      id="btn-salvar-dentista"
                      className="flex-1 py-2.5 bg-sky-800 hover:bg-sky-700 text-white rounded font-bold cursor-pointer text-center shadow-xs"
                    >
                      Cadastrar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}


          {/* 2. REQUISITO MODAL: EDITAR DADOS DENTISTA & BORRAR ODONTÓLOGO */}
          {showEditDentist && selectedDentist && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-scale-up">
                
                {/* Header matching exact layout of prompt design mockup */}
                <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">
                    Editar Dentista
                  </h3>
                  <button 
                    onClick={() => setShowEditDentist(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleEditDentist} className="p-4 space-y-3.5 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Nome do Profissional
                    </label>
                    <input 
                      type="text" 
                      value={editDentistName}
                      onChange={(e) => setEditDentistName(e.target.value)}
                      className="w-full p-2.5 mt-1 border border-slate-200 rounded focus:ring-1 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Endereço da Clínica
                    </label>
                    <input 
                      type="text" 
                      value={editDentistAddress}
                      onChange={(e) => setEditDentistAddress(e.target.value)}
                      className="w-full p-2.5 mt-1 border border-slate-200 rounded focus:ring-1 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Telefone / WhatsApp
                    </label>
                    <input 
                      type="text" 
                      value={editDentistPhone}
                      onChange={(e) => setEditDentistPhone(e.target.value)}
                      className="w-full p-2.5 mt-1 border border-slate-200 rounded focus:ring-1 focus:outline-none"
                    />
                  </div>

                  {/* REQUISITO: EDITAR SUMMARY DE VALORES DE CADA TRABALHO ACUMULADO */}
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-600 uppercase">Manual Override de Totais</span>
                      <input 
                        type="checkbox"
                        checked={useManualTotals}
                        onChange={(e) => setUseManualTotals(e.target.checked)}
                        className="w-4 h-4 text-sky-800 cursor-pointer"
                        id="checkbox-manual-totals"
                      />
                    </div>
                    
                    {useManualTotals && (
                      <div className="grid grid-cols-2 gap-2 animate-fade-in text-[10px]">
                        <div>
                          <label className="block font-semibold text-slate-500 uppercase">Total a Receber</label>
                          <input 
                            type="number" 
                            value={manualTotalReceber}
                            onChange={(e) => setManualTotalReceber(Number(e.target.value))}
                            className="w-full p-2 mt-1 border border-slate-200 rounded bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-500 uppercase">Total Recebido</label>
                          <input 
                            type="number" 
                            value={manualTotalRecebido}
                            onChange={(e) => setManualTotalRecebido(Number(e.target.value))}
                            className="w-full p-2 mt-1 border border-slate-200 rounded bg-white font-mono"
                          />
                        </div>
                      </div>
                    )}
                    <p className="text-[9px] text-slate-400">
                      Caso marque, os valores no resumo do perfil usarão estes números ao invés do cálculo dos trabalhos.
                    </p>
                  </div>

                  {/* REQUISITO: BOTÃO BORRAR ODONTÓLOGO (TRASH ICON) */}
                  <div className="pt-2">
                    <button 
                      type="button"
                      onClick={handleDeleteDentist}
                      id="btn-delete-dentista"
                      className="w-full py-2 border border-red-200 hover:bg-red-50 text-red-600 rounded font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer text-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                      Apagar / Excluir Odontólogo
                    </button>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button 
                      type="button" 
                      onClick={() => setShowEditDentist(false)}
                      className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded font-semibold cursor-pointer text-center"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      id="btn-salvar-alteracoes-dentista"
                      className="flex-1 py-3 bg-sky-800 hover:bg-sky-700 text-white rounded font-bold cursor-pointer text-center"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}


          {/* 3. REQUISITO MODAL: AGREGAR TRABALHO POP-UP
              "abre pop-up onde adicionará trabalhos correspondentes: data de início ou data de entrega, text do nome do paciente, text do trabalho, número para preço, text para observações" */}
          {showAddJob && selectedDentist && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-scale-up">
                <div className="bg-sky-800 p-4 flex items-center justify-between text-white">
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Adicionar Trabalho • {selectedDentist.name}
                  </h3>
                  <button 
                    onClick={() => setShowAddJob(false)}
                    className="p-1 rounded-full text-white hover:bg-sky-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleAddJob} className="p-4 space-y-3 text-xs">
                  
                  {/* Toggle: Data de Início vs Data de Entrega */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Tipo de Agendamento de Data
                    </label>
                    <div className="flex bg-slate-100 p-1 rounded">
                      <button
                        type="button"
                        onClick={() => setNewJobDateType('inicio')}
                        className={`flex-1 text-center py-1 rounded text-[11px] font-semibold cursor-pointer ${
                          newJobDateType === 'inicio' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        Data de Início
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewJobDateType('entrega')}
                        className={`flex-1 text-center py-1 rounded text-[11px] font-semibold cursor-pointer ${
                          newJobDateType === 'entrega' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        Data de Entrega
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Data Agendada
                    </label>
                    <input 
                      type="date"
                      required
                      value={newJobDate}
                      onChange={(e) => setNewJobDate(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Nome do Paciente (Texto)
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ex: Carlos Mendes"
                      required
                      value={newJobPatient}
                      onChange={(e) => setNewJobPatient(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Tipo de Trabalho (Texto)
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ex: Prótese Total Superior"
                      required
                      value={newJobType}
                      onChange={(e) => setNewJobType(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Preço Cobrado (Número R$)
                    </label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={newJobPrice || ''}
                      onChange={(e) => setNewJobPrice(Number(e.target.value))}
                      className="w-full p-2 border border-slate-200 rounded focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Observações (Texto)
                    </label>
                    <textarea 
                      placeholder="Medidas, escala Vita, detalhes de metalúrgica..."
                      rows={2}
                      value={newJobNotes}
                      onChange={(e) => setNewJobNotes(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button 
                      type="button" 
                      onClick={() => setShowAddJob(false)}
                      className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded font-semibold cursor-pointer text-center"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      id="btn-confirmar-trabalho"
                      className="flex-1 py-2.5 bg-sky-850 hover:bg-sky-800 text-white rounded font-bold cursor-pointer text-center shadow-xs"
                    >
                      Adicionar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}


          {/* 4. REQUISITO MODAL: ENTRAR NO TRABALHO MOSTRANDO TODOS OS DADOS (DETAILS DIAGRAM POPUP) */}
          {showJobDetails && selectedJob && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="bg-sky-800 p-4 text-white flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    Detalhamento do Trabalho
                  </h3>
                  <button 
                    onClick={() => setShowJobDetails(false)}
                    className="p-1 rounded-full text-white hover:bg-sky-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 space-y-4 text-xs">
                  
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trabalho</span>
                    <span className="text-sm font-extrabold text-slate-800 mt-0.5 block">{selectedJob.jobName}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Paciente</span>
                      <span className="font-semibold text-slate-800">{selectedJob.patientName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Preço Acordado</span>
                      <strong className="font-bold text-slate-900 font-mono text-sm">{formatCurrency(selectedJob.price)}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Referência de Data</span>
                      <span className="font-semibold capitalize text-slate-700">{selectedJob.dateType === 'inicio' ? 'Data de Início' : 'Data de Entrega'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Data Registrada</span>
                      <span className="font-semibold text-slate-700 font-mono">{formatDateBrazilian(selectedJob.date)}</span>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Status Financeiro</span>
                      <span className={`inline-block mt-0.5 px-2 py-0.5 rounded font-bold font-mono text-[10px] ${
                        selectedJob.isPaid ? 'bg-teal-100 text-teal-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {selectedJob.isPaid ? 'CONCLUÍDO / PAGO' : 'PENDIENTE / EM ABERTO'}
                      </span>
                    </div>

                    {selectedJob.isPaid && selectedJob.paymentDate && (
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Formulado em</span>
                        <span className="font-mono text-slate-600 text-[10px]">{formatDateBrazilian(selectedJob.paymentDate)}</span>
                      </div>
                    )}
                  </div>

                  {selectedJob.notes && (
                    <div className="bg-amber-50/50 p-2.5 rounded border border-amber-100 mt-2">
                      <span className="block text-[9px] font-bold text-amber-800 uppercase tracking-wide">Observações Clínicas</span>
                      <p className="text-[10px] text-slate-600 italic mt-0.5 font-sans leading-relaxed">
                        "{selectedJob.notes}"
                      </p>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 flex gap-1.5">
                    {/* Excluir Trabalho Button */}
                    <button 
                      type="button"
                      onClick={() => handleDeleteJob(selectedJob.id)}
                      className="p-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded font-semibold cursor-pointer text-center"
                      title="Excluir"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>

                    {/* REQUISITO: BOTÃO DE EDITAR INFORMACIÓN DE TRABALHO */}
                    <button 
                      type="button"
                      onClick={() => openEditJobModal(selectedJob)}
                      id="btn-editar-trabalho-modal"
                      className="flex-1 py-2 bg-sky-800 hover:bg-sky-700 text-white rounded font-bold cursor-pointer text-center"
                    >
                      Editar Informações
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* 5. REQUISITO MODAL: EDITAR AS INFORMAÇÕES DESSE TRABALHO FORM */}
          {showEditJob && selectedJob && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 p-4 flex items-center justify-between text-white">
                  <h3 className="text-xs font-bold uppercase tracking-widest">
                    Editar Trabalho
                  </h3>
                  <button 
                    onClick={() => {
                      setShowEditJob(false);
                      setSelectedJob(null);
                    }}
                    className="p-1 rounded-full text-white hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleEditJob} className="p-4 space-y-3.5 text-xs">
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Nome do Paciente (Texto)
                    </label>
                    <input 
                      type="text" 
                      value={editJobPatient}
                      onChange={(e) => setEditJobPatient(e.target.value)}
                      className="w-full p-2.5 mt-1 border border-slate-200 rounded focus:ring-1 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Trabalho / Descrição (Texto)
                    </label>
                    <input 
                      type="text" 
                      value={editJobType}
                      onChange={(e) => setEditJobType(e.target.value)}
                      className="w-full p-2.5 mt-1 border border-slate-200 rounded focus:ring-1 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                        Preço (Número em R$)
                      </label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={editJobPrice}
                        onChange={(e) => setEditJobPrice(Number(e.target.value))}
                        className="w-full p-2.5 mt-1 border border-slate-200 rounded focus:ring-1 focus:outline-none font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                        Data Associada
                      </label>
                      <input 
                        type="date" 
                        value={editJobDate}
                        onChange={(e) => setEditJobDate(e.target.value)}
                        className="w-full p-2.5 mt-1 border border-slate-200 rounded"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Data Pertencente a
                    </label>
                    <div className="flex bg-slate-100 p-0.5 rounded">
                      <button
                        type="button"
                        onClick={() => setEditJobDateType('inicio')}
                        className={`flex-1 text-center py-1.5 rounded text-[10px] font-bold uppercase ${
                          editJobDateType === 'inicio' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        Início
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditJobDateType('entrega')}
                        className={`flex-1 text-center py-1.5 rounded text-[10px] font-bold uppercase ${
                          editJobDateType === 'entrega' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        Entrega
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Observações
                    </label>
                    <textarea 
                      rows={2}
                      value={editJobNotes}
                      onChange={(e) => setEditJobNotes(e.target.value)}
                      className="w-full p-2.5 mt-1 border border-slate-200 rounded focus:ring-1 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowEditJob(false);
                        setSelectedJob(null);
                      }}
                      className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded font-semibold text-center"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 py-2.5 bg-sky-800 hover:bg-sky-700 text-white rounded font-bold text-center shadow-xs"
                    >
                      Salvar Cadastro
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}


          {/* 6. REQUISITO DIALOG MODAL: PERGUNTA DE DATA DE PAGAMENTO (TRIGGERED BY PAGO SWITCH ON-ACTION) */}
          {showPaymentPrompt && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white w-full max-w-xs rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-xs">
                <div className="bg-teal-700 p-4 text-white flex items-center justify-between">
                  <h3 className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Registrar Data Pagamento
                  </h3>
                  <button 
                    onClick={() => {
                      setShowPaymentPrompt(false);
                      setJobToPayId(null);
                    }}
                    className="text-white font-bold text-sm px-1.5"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleConfirmPayment} className="p-4 space-y-3.5">
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Faturamento bem sucedido! Insira abaixo a data correspondente em que o pagamento foi efetuado pelo odontólogo.
                  </p>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">
                      Data do Pagamento
                    </label>
                    <input 
                      type="date"
                      required
                      value={paymentDateInput}
                      onChange={(e) => setPaymentDateInput(e.target.value)}
                      className="w-full p-2.5 mt-1 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-teal-600 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button 
                      type="button"
                      onClick={() => {
                        setShowPaymentPrompt(false);
                        setJobToPayId(null);
                      }}
                      className="flex-1 py-2 border border-slate-200 text-slate-600 rounded font-semibold text-center"
                    >
                      Voltar
                    </button>
                    <button 
                      type="submit"
                      id="btn-confirmar-data-pagamento"
                      className="flex-1 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded font-bold text-center"
                    >
                      Confirmar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}


          {/* 7. REQUISITO MODAL: VER HISTÓRICO POR MÊS E ANO SEARCH POP-UP */}
          {showHistorySearch && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-xs">
                
                <div className="bg-sky-850 p-4 text-white flex items-center justify-between">
                  <h3 className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4" />
                    Histórico Geral de Faturamento
                  </h3>
                  <button 
                    onClick={() => {
                      setShowHistorySearch(false);
                      setHistoryResult(null);
                    }}
                    className="text-white font-bold hover:opacity-80"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  <form onSubmit={handleSearchHistory} className="space-y-3">
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Selecione o mês e o ano que deseja buscar para filtrar as faturas e lucros calculados de trabalhos fechados.
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Escolher Mês</label>
                        <select 
                          value={searchHistoryMonth}
                          onChange={(e) => setSearchHistoryMonth(Number(e.target.value))}
                          className="w-full p-2 border border-slate-200 bg-white rounded text-xs focus:outline-none"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{getMonthName(m)}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Escolher Ano</label>
                        <select 
                          value={searchHistoryYear}
                          onChange={(e) => setSearchHistoryYear(Number(e.target.value))}
                          className="w-full p-2 border border-slate-200 bg-white rounded text-xs focus:outline-none"
                        >
                          {[2028, 2027, 2026, 2025, 2024, 2023].map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      id="btn-pesquisar-periodo"
                      className="w-full py-2.5 bg-sky-800 hover:bg-sky-700 text-white font-bold rounded-lg text-center cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Pesquisar Período
                    </button>
                  </form>

                  {/* Search Period Output details */}
                  {historyResult && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 animate-fade-in text-slate-800">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <span className="font-bold text-slate-900 text-xs">
                          {getMonthName(searchHistoryMonth)} de {searchHistoryYear}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 font-bold rounded bg-sky-100 text-sky-800 uppercase">
                          {historyResult.calculated ? 'Cálculo Dinâmico' : 'Arquivo Histórico'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center text-rose-800 bg-rose-50/50 p-1.5 rounded">
                          <span>Total a Receber (Em aberto):</span>
                          <strong className="font-mono font-bold text-rose-700">{formatCurrency(historyResult.totalReceber)}</strong>
                        </div>
                        <div className="flex justify-between items-center text-teal-800 bg-teal-50/50 p-1.5 rounded">
                          <span>Total Recebido neste período:</span>
                          <strong className="font-mono font-bold text-teal-700">{formatCurrency(historyResult.totalRecebido)}</strong>
                        </div>
                      </div>

                      <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>Trabalhos Pagos no mês: <strong className="font-semibold text-slate-800">{historyResult.jobsPaidCount}</strong></span>
                        <span>Trabalhos Pendentes: <strong className="font-semibold text-slate-800">{historyResult.jobsPendingCount}</strong></span>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100">
                    <button 
                      type="button"
                      onClick={() => {
                        setShowHistorySearch(false);
                        setHistoryResult(null);
                      }}
                      className="w-full py-2 text-center text-slate-600 bg-slate-100 hover:bg-slate-200 rounded font-semibold cursor-pointer"
                    >
                      Fechar Histórico
                    </button>
                  </div>

                </div>

              </div>
            </div>
          )}


          {/* 8. INTERACTIVE MODAL: TRABALHOS PARA ENTREGAR HOJE */}
          {showTodayJobs && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-xs flex flex-col max-h-[80%]">
                
                {/* Header of Today's list */}
                <div className="bg-slate-950 p-4 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#4fdbcc]" />
                    <h3 className="font-bold uppercase tracking-wider text-[11px]">
                      Trabalhos para Entregar Hoje
                    </h3>
                  </div>
                  <button 
                    onClick={() => setShowTodayJobs(false)}
                    className="p-1 rounded-full text-white hover:bg-slate-800 cursor-pointer"
                    id="btn-close-today-jobs-top"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                <div className="p-4 overflow-y-auto space-y-4 flex-1">
                  
                  {/* Operational Date display */}
                  <div className="bg-sky-50 border border-sky-100/60 p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-500">Data Operacional</span>
                      <strong className="text-sm text-sky-950 font-bold font-mono">
                        {formatDateBrazilian(currentDateString)}
                      </strong>
                    </div>
                    {/* Badge */}
                    <div className="text-right">
                      <span className="block text-[9px] uppercase text-slate-500 font-semibold">Trabalhos Pendentes</span>
                      <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${pendingJobsTodayCount > 0 ? 'bg-rose-100 text-rose-800' : 'bg-teal-100 text-teal-800'}`}>
                        {pendingJobsTodayCount} pendentes
                      </span>
                    </div>
                  </div>

                  {/* List of jobs */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
                      Relação de Clínicas e Trabalhos ({jobs.filter(j => j.date === currentDateString).length})
                    </h4>

                    {jobs.filter(j => j.date === currentDateString).length === 0 ? (
                      <div className="text-center py-8 text-slate-450 space-y-2">
                        <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs">Nenhum trabalho agendado para entregar hoje.</p>
                        <p className="text-[10.5px] text-slate-500 leading-normal">
                          Para testar outros dias ou alterar a data ativa, mude a data na aba **Ajustes**.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {jobs.filter(j => j.date === currentDateString).map(job => {
                          const dr = dentists.find(d => d.id === job.dentistId);
                          return (
                            <div 
                              key={job.id}
                              className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2.5"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <span className="text-xs font-bold text-slate-900 block line-clamp-1">
                                    {job.jobName}
                                  </span>
                                  <p className="text-[10px] text-slate-500 mt-0.5">
                                    Paciente: <strong className="font-semibold text-slate-700">{job.patientName}</strong>
                                  </p>
                                  {dr && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        viewDentistProfile(dr.id);
                                        setShowTodayJobs(false);
                                      }}
                                      className="text-[10px] text-sky-800 font-bold hover:underline mt-1 text-left flex items-center gap-0.5 cursor-pointer"
                                    >
                                      Clínica: {dr.name} &rarr;
                                    </button>
                                  )}
                                </div>
                                
                                <div className="text-right shrink-0">
                                  <span className="text-xs font-bold font-mono block text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded">
                                    {formatCurrency(job.price)}
                                  </span>
                                </div>
                              </div>

                              {/* Toggle switch for payment status inside the popup */}
                              <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/50">
                                <div>
                                  {job.isPaid ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-teal-100 text-teal-800 border border-teal-200 inline-flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Pago
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center">
                                      Pendiente
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-500 font-medium font-mono">
                                    {job.isPaid ? 'Marcar Pendente' : 'Marcar Pago'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleJobPayment(job, !job.isPaid)}
                                    className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-250 cursor-pointer flex items-center ${
                                      job.isPaid ? 'bg-teal-600' : 'bg-slate-300'
                                    }`}
                                  >
                                    <div className={`bg-white w-4.5 h-4.5 rounded-full shadow-xs transform transition-transform duration-250 ${
                                      job.isPaid ? 'translate-x-[18px]' : 'translate-x-0'
                                    }`} />
                                  </button>
                                </div>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>

                {/* Footer close option */}
                <div className="p-4 border-t border-slate-100 shrink-0 bg-slate-50">
                  <button 
                    type="button"
                    onClick={() => setShowTodayJobs(false)}
                    className="w-full py-2.5 text-center text-white bg-slate-800 hover:bg-slate-900 rounded-lg font-bold cursor-pointer transition-colors"
                    id="btn-close-today-jobs-bottom"
                  >
                    Fechar Janela
                  </button>
                </div>

              </div>
            </div>
          )}


          </div>
        )}

      </div>



    </div>
  );
}
