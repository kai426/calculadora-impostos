// --- SELETORES DE ELEMENTOS DO DOM ---
const btnModeCLT = document.getElementById("btn-mode-clt");
const btnModePJ = document.getElementById("btn-mode-pj");
const formCLT = document.getElementById("form-clt");
const formPJ = document.getElementById("form-pj");

const btnCalculateCLT = document.getElementById("calculate-clt");
const btnCalculatePJ = document.getElementById("calculate-pj");
const reportContent = document.getElementById("report-content");

// --- CONSTANTES DE CÁLCULO (Baseado nas especificações) ---
const VALOR_POR_DEPENDENTE = 189.59; // Valor dedutível por dependente no INSS (2024)

// TABELA DO INSS DE 2024
const TABELA_INSS = [
  { limite: 1412.0, aliquota: 0.075 },
  { limite: 2666.68, aliquota: 0.09 },
  { limite: 4000.03, aliquota: 0.12 },
  { limite: 7786.02, aliquota: 0.14 },
];

// TABELA DO IRRF
const TABELA_IRRF = [
  { limite: 2259.2, aliquota: 0, deducao: 0 },
  { limite: 2826.65, aliquota: 0.075, deducao: 169.92 },
  { limite: 3751.05, aliquota: 0.15, deducao: 381.44 },
  { limite: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { limite: Infinity, aliquota: 0.275, deducao: 896.0 },
];

// --- MANIPULADORES DE EVENTOS ---

// Alternar entre os modos de calculadora
btnModeCLT.addEventListener("click", () => {
  formCLT.style.display = "flex";
  formPJ.style.display = "none";
  btnModeCLT.classList.add("active");
  btnModePJ.classList.remove("active");
  clearReport();
});

btnModePJ.addEventListener("click", () => {
  formCLT.style.display = "none";
  formPJ.style.display = "flex";
  btnModePJ.classList.add("active");
  btnModeCLT.classList.remove("active");
  clearReport();
});

// Botões de cálculo
btnCalculateCLT.addEventListener("click", handleCalculateCLT);
btnCalculatePJ.addEventListener("click", handleCalculatePJ);

// --- FUNÇÕES PRINCIPAIS DE CÁLCULO ---
function handleCalculateCLT() {
  const salarioBruto = parseFloat(
    document.getElementById("clt-salario-bruto").value
  );
  const numDependentes =
    parseInt(document.getElementById("clt-dependentes").value) || 0;

  if (isNaN(salarioBruto) || salarioBruto <= 0) {
    alert("Por favor, insira um salário bruto válido.");
    return;
  }
  if (isNaN(numDependentes) || numDependentes < 0) {
    alert("Por favor, insira um número válido de dependentes.");
    return;
  }

  // Lógica de cálculo sequencial
  const fgts = calcularFGTS(salarioBruto);
  const inss = calcularINSS(salarioBruto);
  const irrf = calcularIRRF(salarioBruto, inss, numDependentes);
  const salarioLiquido = calcularSalarioLiquido(salarioBruto, inss, irrf);

  displayReportCLT(salarioBruto, fgts, inss, irrf, salarioLiquido);
}

function handleCalculatePJ() {
    const faturamentoBruto = parseFloat(document.getElementById("pj-faturamento").value);
    const regime = document.getElementById("pj-regime").value;

    if (isNaN(faturamentoBruto) || faturamentoBruto <= 0) {
        alert("Por favor, insira um faturamento bruto válido.");
        return;
    }

    let results = {};
    if (regime === "simples") {
        results = calcularSimplesNacional(faturamentoBruto);
    } else {
        results = calcularLucroPresumido(faturamentoBruto);
    }

    displayPJReport(faturamentoBruto, regime, results);
}

// --- LÓGICA DE CÁLCULO CLT ---
function calcularFGTS(salario) {
  return salario * 0.08;
}

function calcularINSS(salario) {
  let totalINSS = 0;
  let baseAnterior = 0;

  for (const faixa of TABELA_INSS) {
    // Encontra a base de cálculo para a faixa atual
    const baseCalculo = Math.min(salario, faixa.limite) - baseAnterior;

    if (baseCalculo <= 0) break; // Sai se não houver mais base para calcular

    totalINSS += baseCalculo * faixa.aliquota;
    baseAnterior = faixa.limite;
  }
  return totalINSS;
}

function calcularIRRF(salario, inss, dependentes) {
  const deducaoDependentes = dependentes * VALOR_POR_DEPENDENTE;
  const baseCalculo = salario - inss - deducaoDependentes;

  if (baseCalculo <= TABELA_IRRF[0].limite) return 0;

  for (const faixa of TABELA_IRRF) {
    if (baseCalculo <= faixa.limite) {
      const impostoBruto = baseCalculo * faixa.aliquota;
      return impostoBruto - faixa.deducao;
    }
  }

  // Fallback para a última faixa (Acima de 4664.68)
  const lastRange = TABELA_IRRF[TABELA_IRRF.length - 1];
  return baseCalculo * lastRange.aliquota - lastRange.deducao;
}

function calcularSalarioLiquido(salario, inss, irrf) {
  return salario - inss - irrf;
}

// --- LÓGICA DE CÁLCULO PJ (SIMPLIFICADO) ---
function calcularSimplesNacional(faturamento) {
  const imposto = faturamento * 0.06; // Alíquota fixa de 6%
  const lucro = faturamento - imposto;
  return { imposto, lucro };
}

function calcularLucroPresumido(faturamento) {
  const pis = faturamento * 0.0065;
  const cofins = faturamento * 0.03;
  const iss = faturamento * 0.05;

  const basePresuncao = faturamento * 0.32; // 32% para serviços
  const irpj = basePresuncao * 0.15;
  const csll = basePresuncao * 0.09;

  const totalImpostos = pis + cofins + iss + irpj + csll;
  const lucroLiquido = faturamento - totalImpostos;

  return {
    imposto: totalImpostos,
    lucro: lucroLiquido,
    details: { pis, cofins, iss, irpj, csll },
  };
}

// --- FUNÇÕES DE EXIBIÇÃO DE RESULTADO ---

// Formatar um número como moeda BRL
function formatCurrency(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Limpar o relatório de resultados
function clearReport() {
  reportContent.innerHTML = "<p>Preencha os valores e clique em calcular.</p>";
}

// Exibir o relatório para CLT
function displayReportCLT(salario, fgts, inss, irrf, liquido) {
  reportContent.innerHTML = `
        <p>
            <span>Salário Bruto:</span>
            <span>${formatCurrency(salario)}</span>
        </p>
        <p class="text-info">
            <span>FGTS (Pago pela empresa):</span>
            <span>${formatCurrency(fgts)}</span>
        </p>
        <p class="text-danger">
            <span>Desconto INSS:</span>
            <span>- ${formatCurrency(inss)}</span>
        </p>
        <p class="text-danger">
            <span>Desconto IRRF:</span>
            <span>- ${formatCurrency(irrf)}</span>
        </p>
        <p class="text-total text-success">
            <span>Salário Líquido:</span>
            <span>${formatCurrency(liquido)}</span>
        </p>
    `;
}

// Exibir o relatório para PJ
function displayPJReport(faturamento, regime, results) {
  let detailsHTML = "";

  if (regime === "presumido" && results.details) {
    detailsHTML = `
            <p style="padding-left: 15px; font-size: 14px;" class="text-danger">
                <span>PIS (0.65%):</span>
                <span>- ${formatCurrency(results.details.pis)}</span>
            </p>
            <p style="padding-left: 15px; font-size: 14px;" class="text-danger">
                <span>COFINS (3%):</span>
                <span>- ${formatCurrency(results.details.cofins)}</span>
            </p>
            <p style="padding-left: 15px; font-size: 14px;" class="text-danger">
                <span>ISS (5%):</span>
                <span>- ${formatCurrency(results.details.iss)}</span>
            </p>
            <p style="padding-left: 15px; font-size: 14px;" class="text-danger">
                <span>IRPJ (15% s/ 32%):</span>
                <span>- ${formatCurrency(results.details.irpj)}</span>
            </p>
            <p style="padding-left: 15px; font-size: 14px;" class="text-danger">
                <span>CSLL (9% s/ 32%):</span>
                <span>- ${formatCurrency(results.details.csll)}</span>
            </p>
        `;
  }

  reportContent.innerHTML = `
        <p>
            <span>Faturamento Bruto:</span>
            <span>${formatCurrency(faturamento)}</span>
        </p>
        <p class="text-danger">
            <span>Total Impostos (${
              regime === "simples" ? "DAS 6%" : "Presumido"
            }):</span>
            <span>- ${formatCurrency(results.imposto)}</span>
        </p>
        ${detailsHTML}
        <p class="text-total text-success">
            <span>Lucro Líquido (PJ):</span>
            <span>${formatCurrency(results.lucro)}</span>
        </p>
    `;
};
