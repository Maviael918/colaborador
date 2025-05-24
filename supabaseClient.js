import { createClient } from 'https://mivafafhshpuplfxemtk.supabase.co'

const SUPABASE_URL = 'https://xxxx.supabase.co'; // 👉 Substituir
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdmFmYWZoc2hwdXBsZnhlbXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2OTg3MTYsImV4cCI6MjA2MzI3NDcxNn0.6OWZsJ9rGnzfcSYwPGw4sYap6Vwe3mji-xWFqyS3UPs'; // 👉 Substituir

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Pega o ID do usuário logado (precisa já estar logado via login.html)
const usuario = JSON.parse(localStorage.getItem('usuario'))

if (!usuario) {
  alert('Usuário não autenticado!')
  window.location.href = 'login.html'
}

const form = document.getElementById('form-trabalho')
const tabela = document.getElementById('tabela-trabalhos')
const dataHoraSpan = document.getElementById('dataHoraAtual')

function atualizarDataHora() {
  const agora = new Date()
  const formatado = agora.toLocaleString('pt-BR')
  dataHoraSpan.textContent = formatado
  return formatado
}

// Atualiza a hora ao carregar a página
atualizarDataHora()

form.addEventListener('submit', async (e) => {
  e.preventDefault()

  const setor = document.getElementById('setor').value
  const emDupla = document.getElementById('emDupla').checked
  const observacao = document.getElementById('observacao').value
  const dataHora = atualizarDataHora()

  const { error } = await supabase
    .from('trabalhos') // 👉 Nome da tabela no Supabase
    .insert([{
      usuario_id: usuario.id,
      setor,
      em_dupla: emDupla,
      observacao,
      data_hora: dataHora
    }])

  if (error) {
    alert('Erro ao registrar trabalho!')
    console.error(error)
  } else {
    form.reset()
    atualizarDataHora()
    carregarTrabalhos()
  }
})

// Carrega os trabalhos desse colaborador
async function carregarTrabalhos() {
  const { data, error } = await supabase
    .from('trabalhos')
    .select('*')
    .eq('usuario_id', usuario.id)
    .order('data_hora', { ascending: false })

  if (error) {
    console.error('Erro ao carregar trabalhos:', error)
    return
  }

  tabela.innerHTML = ''
  data.forEach((trabalho) => {
    const linha = document.createElement('tr')
    linha.innerHTML = `
      <td>${trabalho.setor}</td>
      <td>${trabalho.em_dupla ? 'Sim' : 'Não'}</td>
      <td>${trabalho.observacao || ''}</td>
      <td>${trabalho.data_hora}</td>
    `
    tabela.appendChild(linha)
  })
}

// Carrega ao entrar
carregarTrabalhos()
