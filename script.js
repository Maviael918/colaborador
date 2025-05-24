// Configuração do Supabase
const supabaseUrl = 'https://mivafafhshpuplfxemtk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdmFmYWZoc2hwdXBsZnhlbXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2OTg3MTYsImV4cCI6MjA2MzI3NDcxNn0.6OWZsJ9rGnzfcSYwPGw4sYap6Vwe3mji-xWFqyS3UPs';
const client = supabase.createClient(supabaseUrl, supabaseAnonKey);

// Dados fixos
const colaboradores = ['Bruninho', 'Issac', 'Maviael', 'Matheus', 'Mikael'];
const locais = ['Setor A', 'Setor B', 'Setor C', 'Setor D', 'Setor F', 'Fazenda Nova', 'São Domingos'];

// Variáveis de estado
let colaboradorSelecionado = null;

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  await inicializarSistema();
});

async function inicializarSistema() {
  await carregarHistorico();
  criarBotoesColaboradores();
  configurarDupla();
  atualizarStatus();
  await carregarControleGlobal();
}

function configurarDupla() {
  const select = document.getElementById('colaborador-dupla');
  if (!select) return;
  
  select.innerHTML = '<option value="">Selecione a dupla</option>';

  colaboradores.forEach(colab => {
    if (colab !== colaboradorSelecionado) {
      const option = document.createElement('option');
      option.value = colab;
      option.textContent = colab;
      select.appendChild(option);
    }
  });

  const checkDupla = document.getElementById('check-dupla');
  if (!checkDupla) return;
  
  checkDupla.addEventListener('change', function() {
    select.disabled = !this.checked;
    if (!this.checked) select.value = "";
  });
}

function criarBotoesColaboradores() {
  const container = document.getElementById('colaboradores-container');
  container.innerHTML = '';

  colaboradores.forEach(colab => {
    const botao = document.createElement('button');
    botao.className = 'botao-colaborador';
    botao.textContent = colab;
    botao.onclick = () => selecionarColaborador(colab);
    container.appendChild(botao);
  });
}

function selecionarColaborador(colaborador) {
  colaboradorSelecionado = colaborador;
  mostrarFormulario(colaborador);
  atualizarStatus();
  configurarDupla();
}

function mostrarFormulario(colaborador) {
  const container = document.getElementById('formulario-container');
  container.innerHTML = `
    <h3>Registrar Trabalho para ${colaborador}</h3>
    <div class="form-group">
      <label for="local-trabalho">Local:</label>
      <select id="local-trabalho" class="form-control">
        ${locais.map(local => `<option value="${local}">${local}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label for="observacao">Observação:</label>
      <input type="text" id="observacao" class="form-control" placeholder="Opcional">
    </div>
    <div class="form-group">
      <input type="checkbox" id="check-dupla"> Registrar em dupla
      <select id="colaborador-dupla" class="form-control" disabled></select>
    </div>
    <button class="btn-registrar" onclick="registrarTrabalho()">Registrar</button>
  `;
}

function atualizarStatus() {
  const status = document.getElementById('status-text');
  if (colaboradorSelecionado) {
    status.textContent = `Registrando trabalho para: ${colaboradorSelecionado}`;
  } else {
    status.textContent = 'Selecione um colaborador';
  }
}

async function registrarTrabalho() {
  const local = document.getElementById('local-trabalho').value;
  const observacao = document.getElementById('observacao').value.trim();
  const isDupla = document.getElementById('check-dupla').checked;
  const dupla = document.getElementById('colaborador-dupla').value;

  if (!local) {
    alert('Selecione um local!');
    return;
  }

  if (isDupla && !dupla) {
    alert('Selecione um colaborador para a dupla!');
    return;
  }

  let colaboradoresRegistro = colaboradorSelecionado;
  if (isDupla && dupla) {
    colaboradoresRegistro = `${colaboradorSelecionado}, ${dupla}`;
  }

  try {
    const { error } = await client
      .from('trabalho_externo')
      .insert([{ 
        colaborador: colaboradoresRegistro, 
        localidade: local,
        observacao: observacao || null,
        data_hora: new Date().toISOString()
      }]);

    if (error) throw error;

    await atualizarStatusGlobal(colaboradoresRegistro);
    mostrarAlerta('success', 'Trabalho registrado com sucesso!');

    document.getElementById('observacao').value = '';
    document.getElementById('check-dupla').checked = false;
    document.getElementById('colaborador-dupla').disabled = true;
    document.getElementById('colaborador-dupla').value = "";

    await carregarHistorico();
    colaboradorSelecionado = null;
    atualizarStatus();

  } catch (error) {
    console.error('Erro ao registrar trabalho:', error);
    mostrarAlerta('error', `Erro ao registrar: ${error.message}`);
  }
}

function mostrarAlerta(tipo, mensagem) {
  const alerta = document.createElement('div');
  alerta.className = `alerta alerta-${tipo}`;
  alerta.textContent = mensagem;

  document.body.appendChild(alerta);

  setTimeout(() => {
    alerta.remove();
  }, 3000);
}

async function atualizarStatusGlobal(colaboradoresRegistro) {
  try {
    const colaboradoresArray = colaboradoresRegistro.includes(',') 
      ? colaboradoresRegistro.split(',').map(c => c.trim())
      : [colaboradoresRegistro];

    for (const colab of colaboradoresArray) {
      const { error } = await client
        .from('controle_pendencias')
        .upsert(
          { 
            colaborador: colab, 
            pendente: false,
            ultima_atualizacao: new Date().toISOString() 
          },
          { 
            onConflict: 'colaborador',
            ignoreDuplicates: false
          }
        );

      if (error) {
        console.error(`Erro ao atualizar ${colab}:`, error);
        throw error;
      }
    }

    console.log('Status global atualizado com sucesso para:', colaboradoresArray);
    return true;

  } catch (error) {
    console.error('Falha ao atualizar status global:', error);
    mostrarAlerta('error', 'Erro ao atualizar status no banco');
    return false;
  }
}

async function carregarHistorico() {
  try {
    const hoje = new Date().toISOString().split('T')[0];

    const { data, error } = await client
      .from('trabalho_externo')
      .select('*')
      .gte('data_hora', hoje + 'T00:00:00')
      .order('data_hora', { ascending: false })
      .limit(10);

    if (error) throw error;

    atualizarTabelaHistorico(data);

  } catch (error) {
    console.error('Erro ao carregar histórico:', error);
  }
}

function atualizarTabelaHistorico(dados) {
  const corpoTabela = document.getElementById('corpo-tabela');
  corpoTabela.innerHTML = '';

  if (dados.length === 0) {
    const linha = document.createElement('tr');
    linha.innerHTML = '<td colspan="4" style="text-align: center;">Nenhum registro hoje</td>';
    corpoTabela.appendChild(linha);
    return;
  }

  dados.forEach(item => {
    const linha = document.createElement('tr');

    const colabCell = document.createElement('td');
    colabCell.textContent = item.colaborador;

    const localCell = document.createElement('td');
    localCell.textContent = item.localidade;

    const dataCell = document.createElement('td');
    dataCell.textContent = new Date(item.data_hora).toLocaleTimeString('pt-BR');

    const obsCell = document.createElement('td');
    obsCell.textContent = item.observacao || '-';

    linha.appendChild(colabCell);
    linha.appendChild(localCell);
    linha.appendChild(dataCell);
    linha.appendChild(obsCell);
    corpoTabela.appendChild(linha);
  });
}

async function carregarControleGlobal() {
  try {
    const { data: controle, error } = await client
      .from('controle_pendencias')
      .select('*');

    if (error) throw error;

    console.log('Controle global carregado:', controle);

  } catch (error) {
    console.error('Erro ao carregar controle global:', error);
  }
}
