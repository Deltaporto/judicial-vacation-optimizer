import datetime
from datetime import date, timedelta
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
from tabulate import tabulate

# Configuração para gráficos mais bonitos
plt.style.use('ggplot')
sns.set_theme(style="whitegrid")
pd.set_option('display.max_rows', None)
pd.set_option('display.max_columns', None)
pd.set_option('display.width', 1000)

# =========================================================
# DEFINIÇÃO DE FERIADOS PARA 2025
# =========================================================

# Feriados nacionais de 2025
feriados_2025 = [
    {'date': '2025-01-01', 'name': 'Confraternização Universal'},
    {'date': '2025-03-03', 'name': 'Carnaval'},
    {'date': '2025-03-04', 'name': 'Carnaval'},
    {'date': '2025-04-18', 'name': 'Sexta-feira Santa'},
    {'date': '2025-04-21', 'name': 'Tiradentes'},
    {'date': '2025-05-01', 'name': 'Dia do Trabalho'},
    {'date': '2025-06-19', 'name': 'Corpus Christi'},
    {'date': '2025-09-07', 'name': 'Independência do Brasil'},
    {'date': '2025-10-12', 'name': 'Nossa Senhora Aparecida'},
    {'date': '2025-11-02', 'name': 'Finados'},
    {'date': '2025-11-15', 'name': 'Proclamação da República'},
    {'date': '2025-12-25', 'name': 'Natal'}
]

# Feriados judiciais 2025
feriados_judiciais_2025 = [
    {'date': '2025-01-31', 'name': 'Dia da Justiça Federal'},
    {'date': '2025-08-11', 'name': 'Dia do Advogado'},
    {'date': '2025-10-28', 'name': 'Dia do Servidor Público'},
    {'date': '2025-12-08', 'name': 'Dia da Justiça'}
]

# Recesso judiciário (adicionando como feriados)
recesso_inicio_2025 = [
    {'date': f'2025-01-0{i}', 'name': 'Recesso Judiciário'} for i in range(1, 7)
]
recesso_fim_2025 = [
    {'date': f'2024-12-{i}', 'name': 'Recesso Judiciário'} for i in range(20, 32)
]

# Combinando todos os feriados
todos_feriados = feriados_2025 + feriados_judiciais_2025 + recesso_inicio_2025 + recesso_fim_2025

# Convertendo datas para objetos datetime
feriados_dates = []
for f in todos_feriados:
    try:
        data = datetime.datetime.strptime(f['date'], '%Y-%m-%d').date()
        feriados_dates.append(data)
    except ValueError:
        print(f"Erro ao converter data: {f['date']}")

# =========================================================
# FUNÇÕES AUXILIARES
# =========================================================

def is_weekend(date):
    """Verifica se a data é um fim de semana"""
    return date.weekday() >= 5  # 5 = sábado, 6 = domingo

def is_holiday(date, holidays_list):
    """Verifica se a data é um feriado"""
    return date in holidays_list

def calculate_days_breakdown(start_date, end_date, holidays_list):
    """Calcula a composição de dias no período"""
    total_days = (end_date - start_date).days + 1
    work_days = 0
    weekend_days = 0
    holiday_days = 0
    holidays_on_workdays = 0
    
    current_date = start_date
    while current_date <= end_date:
        is_holiday_day = is_holiday(current_date, holidays_list)
        is_weekend_day = is_weekend(current_date)
        
        if is_holiday_day and not is_weekend_day:
            holidays_on_workdays += 1
            holiday_days += 1
        elif is_holiday_day:
            holiday_days += 1
        elif is_weekend_day:
            weekend_days += 1
        else:
            work_days += 1
        
        current_date += timedelta(days=1)
    
    return {
        'total_days': total_days,
        'work_days': work_days,
        'weekend_days': weekend_days,
        'holiday_days': holiday_days,
        'holidays_on_workdays': holidays_on_workdays,
        'non_work_days': weekend_days + holiday_days
    }

# =========================================================
# IMPLEMENTAÇÕES DE CÁLCULO DE EFICIÊNCIA
# =========================================================

def calculate_efficiency_original(start_date, end_date, holidays_list):
    """Implementação original do cálculo de eficiência"""
    # Análise do período
    days = calculate_days_breakdown(start_date, end_date, holidays_list)
    
    # Dias úteis consumidos
    work_days_spent = days['work_days']
    
    # Feriados em dias úteis
    holidays_on_workdays = days['holidays_on_workdays']
    
    # Valor estratégico (posicionamento semanal)
    strategic_value = 0
    
    # Bônus para início em segunda-feira
    if start_date.weekday() == 0:  # 0 = segunda-feira
        strategic_value += 0.3
    
    # Bônus para término em sexta-feira
    if end_date.weekday() == 4:  # 4 = sexta-feira
        strategic_value += 0.3
    
    # Bônus adicional para período "perfeito" (segunda a sexta)
    if start_date.weekday() == 0 and end_date.weekday() == 4:
        strategic_value += 0.3
    
    # Valor de "ativação de fim de semana"
    weekend_activation_value = 0
    
    # Férias terminando na sexta ativa o fim de semana seguinte
    if end_date.weekday() == 4:
        weekend_activation_value += 0.6
    
    # Férias começando na segunda aproveita o fim de semana anterior
    if start_date.weekday() == 0:
        weekend_activation_value += 0.6
    
    # Penalização por desperdício
    waste_penalty = 0
    
    # Calcular proporção de dias não úteis no período total
    if days['total_days'] > 0:
        waste_ratio = days['non_work_days'] / days['total_days']
        waste_penalty = waste_ratio * 0.3
    
    # Cálculo da eficiência final
    if work_days_spent == 0:
        return 0  # Evitar divisão por zero
    
    efficiency = (holidays_on_workdays + strategic_value + weekend_activation_value - waste_penalty) / work_days_spent
    
    # Aplicar multiplicador para manter escala
    return efficiency + 1.0

def calculate_efficiency_exponential(start_date, end_date, holidays_list):
    """Implementação com penalização exponencial por dia desperdiçado"""
    # Análise do período
    days = calculate_days_breakdown(start_date, end_date, holidays_list)
    
    # Dias úteis consumidos
    work_days_spent = days['work_days']
    
    # Feriados em dias úteis
    holidays_on_workdays = days['holidays_on_workdays']
    
    # Valor estratégico (posicionamento semanal)
    strategic_value = 0
    
    # Bônus para início em segunda-feira
    if start_date.weekday() == 0:
        strategic_value += 0.3
    
    # Bônus para término em sexta-feira
    if end_date.weekday() == 4:
        strategic_value += 0.3
    
    # Bônus adicional para período "perfeito" (segunda a sexta)
    if start_date.weekday() == 0 and end_date.weekday() == 4:
        strategic_value += 0.3
    
    # Valor de "ativação de fim de semana"
    weekend_activation_value = 0
    
    # Férias terminando na sexta ativa o fim de semana seguinte
    if end_date.weekday() == 4:
        weekend_activation_value += 0.6
    
    # Férias começando na segunda aproveita o fim de semana anterior
    if start_date.weekday() == 0:
        weekend_activation_value += 0.6
    
    # Penalização por desperdício - VERSÃO EXPONENCIAL
    waste_penalty = 0
    
    # Penalização exponencial: cada dia adicional de desperdício é mais caro
    non_work_days = days['non_work_days']
    if non_work_days > 0:
        # Fator exponencial: 0.3 para primeiro dia, 0.3*1.5 para segundo, 0.3*1.5^2 para terceiro, etc.
        base_factor = 0.3
        growth_rate = 1.5
        
        for i in range(non_work_days):
            waste_penalty += base_factor * (growth_rate ** i)
    
    # Cálculo da eficiência final
    if work_days_spent == 0:
        return 0
    
    efficiency = (holidays_on_workdays + strategic_value + weekend_activation_value - waste_penalty) / work_days_spent
    
    return efficiency + 1.0

def calculate_efficiency_hybrid(start_date, end_date, holidays_list):
    """Implementação híbrida com penalização por dia mais inteligente"""
    # Análise do período
    days = calculate_days_breakdown(start_date, end_date, holidays_list)
    
    # Dias úteis consumidos
    work_days_spent = days['work_days']
    
    # Feriados em dias úteis
    holidays_on_workdays = days['holidays_on_workdays']
    
    # Valor estratégico (posicionamento semanal)
    strategic_value = 0
    
    # Bônus para início em segunda-feira
    if start_date.weekday() == 0:
        strategic_value += 0.3
    
    # Bônus para término em sexta-feira
    if end_date.weekday() == 4:
        strategic_value += 0.3
    
    # Bônus adicional para período "perfeito" (segunda a sexta)
    if start_date.weekday() == 0 and end_date.weekday() == 4:
        strategic_value += 0.3
    
    # Valor de "ativação de fim de semana"
    weekend_activation_value = 0
    
    # Férias terminando na sexta ativa o fim de semana seguinte
    if end_date.weekday() == 4:
        weekend_activation_value += 0.6
    
    # Férias começando na segunda aproveita o fim de semana anterior
    if start_date.weekday() == 0:
        weekend_activation_value += 0.6
    
    # Penalização por desperdício - VERSÃO HÍBRIDA
    waste_penalty = 0
    non_work_days = days['non_work_days']
    
    # Abordagem híbrida: penalização fixa + incremental dependendo do nível
    if non_work_days > 0:
        # Penalização para o primeiro dia não-útil (mais substancial)
        first_day_penalty = 0.35
        
        # Penalização incremental para dias adicionais (progressivamente maior)
        if non_work_days == 1:
            waste_penalty = first_day_penalty
        else:
            # Primeiro dia tem penalidade fixa maior
            # Dias adicionais têm penalidade incremental
            additional_days = non_work_days - 1
            additional_penalty = 0
            
            for i in range(additional_days):
                # Cada dia adicional tem penalidade 80% maior que o anterior
                additional_penalty += first_day_penalty * (1.8 ** i)
            
            waste_penalty = first_day_penalty + additional_penalty
    
    # Cálculo da eficiência final
    if work_days_spent == 0:
        return 0
    
    efficiency = (holidays_on_workdays + strategic_value + weekend_activation_value - waste_penalty) / work_days_spent
    
    return efficiency + 1.0

# =========================================================
# FUNÇÕES DE TESTE
# =========================================================

def test_specific_cases():
    """Testa os casos específicos mencionados (períodos sem feriados)"""
    # Selecionar uma semana regular sem feriados (primeira semana de fevereiro 2025)
    monday = date(2025, 2, 3)     # Segunda-feira
    friday = date(2025, 2, 7)     # Sexta-feira
    saturday = date(2025, 2, 8)   # Sábado
    sunday = date(2025, 2, 9)     # Domingo
    tuesday = date(2025, 2, 11)   # Terça-feira (para período de 7 dias com 5 úteis)
    wednesday = date(2025, 2, 12) # Quarta-feira (para período de 8 dias com 5 úteis)
    
    # Períodos com mesmo número de dias úteis (5), mas diferentes períodos totais
    seg_sex_days = calculate_days_breakdown(monday, friday, feriados_dates)
    seg_sab_days = calculate_days_breakdown(monday, saturday, feriados_dates)
    seg_dom_days = calculate_days_breakdown(monday, sunday, feriados_dates)
    seg_ter_days = calculate_days_breakdown(monday, tuesday, feriados_dates)
    seg_qua_days = calculate_days_breakdown(monday, wednesday, feriados_dates)
    
    # Calcular eficiência com todos os métodos
    results = {
        'Segunda a Sexta (5+0)': {
            'dias_uteis': seg_sex_days['work_days'],
            'dias_nao_uteis': seg_sex_days['non_work_days'],
            'original': calculate_efficiency_original(monday, friday, feriados_dates),
            'exponencial': calculate_efficiency_exponential(monday, friday, feriados_dates),
            'hibrido': calculate_efficiency_hybrid(monday, friday, feriados_dates)
        },
        'Segunda a Sábado (5+1)': {
            'dias_uteis': seg_sab_days['work_days'],
            'dias_nao_uteis': seg_sab_days['non_work_days'],
            'original': calculate_efficiency_original(monday, saturday, feriados_dates),
            'exponencial': calculate_efficiency_exponential(monday, saturday, feriados_dates),
            'hibrido': calculate_efficiency_hybrid(monday, saturday, feriados_dates)
        },
        'Segunda a Domingo (5+2)': {
            'dias_uteis': seg_dom_days['work_days'],
            'dias_nao_uteis': seg_dom_days['non_work_days'],
            'original': calculate_efficiency_original(monday, sunday, feriados_dates),
            'exponencial': calculate_efficiency_exponential(monday, sunday, feriados_dates),
            'hibrido': calculate_efficiency_hybrid(monday, sunday, feriados_dates)
        },
        'Segunda a Terça (6+1)': {
            'dias_uteis': seg_ter_days['work_days'],
            'dias_nao_uteis': seg_ter_days['non_work_days'],
            'original': calculate_efficiency_original(monday, tuesday, feriados_dates),
            'exponencial': calculate_efficiency_exponential(monday, tuesday, feriados_dates),
            'hibrido': calculate_efficiency_hybrid(monday, tuesday, feriados_dates)
        },
        'Segunda a Quarta (7+1)': {
            'dias_uteis': seg_qua_days['work_days'],
            'dias_nao_uteis': seg_qua_days['non_work_days'],
            'original': calculate_efficiency_original(monday, wednesday, feriados_dates),
            'exponencial': calculate_efficiency_exponential(monday, wednesday, feriados_dates),
            'hibrido': calculate_efficiency_hybrid(monday, wednesday, feriados_dates)
        }
    }
    
    # Calcular diferenças entre períodos
    differences = {
        'Original 5+0 vs 5+1': results['Segunda a Sexta (5+0)']['original'] - results['Segunda a Sábado (5+1)']['original'],
        'Original 5+1 vs 5+2': results['Segunda a Sábado (5+1)']['original'] - results['Segunda a Domingo (5+2)']['original'],
        'Exponencial 5+0 vs 5+1': results['Segunda a Sexta (5+0)']['exponencial'] - results['Segunda a Sábado (5+1)']['exponencial'],
        'Exponencial 5+1 vs 5+2': results['Segunda a Sábado (5+1)']['exponencial'] - results['Segunda a Domingo (5+2)']['exponencial'],
        'Híbrido 5+0 vs 5+1': results['Segunda a Sexta (5+0)']['hibrido'] - results['Segunda a Sábado (5+1)']['hibrido'],
        'Híbrido 5+1 vs 5+2': results['Segunda a Sábado (5+1)']['hibrido'] - results['Segunda a Domingo (5+2)']['hibrido'],
    }
    
    return results, differences

def test_many_periods():
    """Testa vários períodos ao longo do ano"""
    results = []
    
    # Para cada semana do ano
    current_date = date(2025, 1, 6)  # Primeira segunda-feira de 2025
    while current_date.year == 2025:
        monday = current_date
        friday = monday + timedelta(days=4)
        saturday = monday + timedelta(days=5)
        sunday = monday + timedelta(days=6)
        
        # Verificar se ainda estamos em 2025
        if sunday.year > 2025:
            break
            
        # Calcular para os três períodos
        seg_sex_eff_orig = calculate_efficiency_original(monday, friday, feriados_dates)
        seg_sex_eff_exp = calculate_efficiency_exponential(monday, friday, feriados_dates)
        seg_sex_eff_hyb = calculate_efficiency_hybrid(monday, friday, feriados_dates)
        
        seg_sab_eff_orig = calculate_efficiency_original(monday, saturday, feriados_dates)
        seg_sab_eff_exp = calculate_efficiency_exponential(monday, saturday, feriados_dates)
        seg_sab_eff_hyb = calculate_efficiency_hybrid(monday, saturday, feriados_dates)
        
        seg_dom_eff_orig = calculate_efficiency_original(monday, sunday, feriados_dates)
        seg_dom_eff_exp = calculate_efficiency_exponential(monday, sunday, feriados_dates)
        seg_dom_eff_hyb = calculate_efficiency_hybrid(monday, sunday, feriados_dates)
        
        # Diferenças
        diff_sex_sab_orig = seg_sex_eff_orig - seg_sab_eff_orig
        diff_sab_dom_orig = seg_sab_eff_orig - seg_dom_eff_orig
        
        diff_sex_sab_exp = seg_sex_eff_exp - seg_sab_eff_exp
        diff_sab_dom_exp = seg_sab_eff_exp - seg_dom_eff_exp
        
        diff_sex_sab_hyb = seg_sex_eff_hyb - seg_sab_eff_hyb
        diff_sab_dom_hyb = seg_sab_eff_hyb - seg_dom_eff_hyb
        
        # Adicionar resultados
        results.append({
            'week_start': monday,
            'seg_sex_orig': seg_sex_eff_orig,
            'seg_sab_orig': seg_sab_eff_orig,
            'seg_dom_orig': seg_dom_eff_orig,
            'seg_sex_exp': seg_sex_eff_exp,
            'seg_sab_exp': seg_sab_eff_exp,
            'seg_dom_exp': seg_dom_eff_exp,
            'seg_sex_hyb': seg_sex_eff_hyb,
            'seg_sab_hyb': seg_sab_eff_hyb,
            'seg_dom_hyb': seg_dom_eff_hyb,
            'diff_sex_sab_orig': diff_sex_sab_orig,
            'diff_sab_dom_orig': diff_sab_dom_orig,
            'diff_sex_sab_exp': diff_sex_sab_exp,
            'diff_sab_dom_exp': diff_sab_dom_exp,
            'diff_sex_sab_hyb': diff_sex_sab_hyb,
            'diff_sab_dom_hyb': diff_sab_dom_hyb
        })
        
        # Avançar para a próxima semana
        current_date += timedelta(days=7)
    
    # Converter para DataFrame para análise
    df = pd.DataFrame(results)
    
    return df

# =========================================================
# EXECUÇÃO DOS TESTES E ANÁLISE
# =========================================================

print("\n" + "="*80)
print("ANÁLISE COMPARATIVA DE MÉTODOS DE CÁLCULO DE EFICIÊNCIA INCLUINDO SOLUÇÃO HÍBRIDA")
print("="*80)

# Teste 1: Casos específicos mencionados
specific_results, specific_differences = test_specific_cases()

print("\n" + "-"*80)
print("TESTE 1: RESULTADOS PARA PERÍODOS ESPECÍFICOS")
print("-"*80)

# Tabela de resultados
specific_table = []
for period, data in specific_results.items():
    specific_table.append([
        period, 
        data['dias_uteis'], 
        data['dias_nao_uteis'],
        f"{data['original']:.4f}",
        f"{data['exponencial']:.4f}",
        f"{data['hibrido']:.4f}"
    ])

print(tabulate(specific_table, 
      headers=["Período", "Dias Úteis", "Dias Não Úteis", "Original", "Exponencial", "Híbrido"],
      tablefmt="grid"))

# Tabela de diferenças
diff_table = [
    ["5 úteis + 0 não úteis vs 5 úteis + 1 não útil", 
     f"{specific_differences['Original 5+0 vs 5+1']:.4f}", 
     f"{specific_differences['Exponencial 5+0 vs 5+1']:.4f}", 
     f"{specific_differences['Híbrido 5+0 vs 5+1']:.4f}"],
    ["5 úteis + 1 não útil vs 5 úteis + 2 não úteis", 
     f"{specific_differences['Original 5+1 vs 5+2']:.4f}", 
     f"{specific_differences['Exponencial 5+1 vs 5+2']:.4f}",
     f"{specific_differences['Híbrido 5+1 vs 5+2']:.4f}"]
]

print("\nDIFERENÇAS ENTRE PERÍODOS:")
print(tabulate(diff_table, 
      headers=["Comparação", "Original", "Exponencial", "Híbrido"],
      tablefmt="grid"))

# Teste 2: Análise de todo o ano
df_results = test_many_periods()

print("\n" + "-"*80)
print("TESTE 2: ESTATÍSTICAS PARA TODO O ANO 2025")
print("-"*80)

# Estatística de diferenças médias
stats = {
    'Média Diferença Sex-Sab Original': df_results['diff_sex_sab_orig'].mean(),
    'Média Diferença Sab-Dom Original': df_results['diff_sab_dom_orig'].mean(),
    'Desvio Padrão Sex-Sab Original': df_results['diff_sex_sab_orig'].std(),
    'Desvio Padrão Sab-Dom Original': df_results['diff_sab_dom_orig'].std(),
    
    'Média Diferença Sex-Sab Exponencial': df_results['diff_sex_sab_exp'].mean(),
    'Média Diferença Sab-Dom Exponencial': df_results['diff_sab_dom_exp'].mean(),
    'Desvio Padrão Sex-Sab Exponencial': df_results['diff_sex_sab_exp'].std(),
    'Desvio Padrão Sab-Dom Exponencial': df_results['diff_sab_dom_exp'].std(),
    
    'Média Diferença Sex-Sab Híbrido': df_results['diff_sex_sab_hyb'].mean(),
    'Média Diferença Sab-Dom Híbrido': df_results['diff_sab_dom_hyb'].mean(),
    'Desvio Padrão Sex-Sab Híbrido': df_results['diff_sex_sab_hyb'].std(),
    'Desvio Padrão Sab-Dom Híbrido': df_results['diff_sab_dom_hyb'].std(),
}

# Calcular proporções
proportions = {
    'Original': stats['Média Diferença Sab-Dom Original'] / stats['Média Diferença Sex-Sab Original'] if stats['Média Diferença Sex-Sab Original'] != 0 else 0,
    'Exponencial': stats['Média Diferença Sab-Dom Exponencial'] / stats['Média Diferença Sex-Sab Exponencial'] if stats['Média Diferença Sex-Sab Exponencial'] != 0 else 0,
    'Híbrido': stats['Média Diferença Sab-Dom Híbrido'] / stats['Média Diferença Sex-Sab Híbrido'] if stats['Média Diferença Sex-Sab Híbrido'] != 0 else 0,
}

# Tabela de estatísticas
stats_table = [
    ["Original", f"{stats['Média Diferença Sex-Sab Original']:.4f}", f"{stats['Média Diferença Sab-Dom Original']:.4f}", 
     f"{proportions['Original']:.4f}"],
    ["Exponencial", f"{stats['Média Diferença Sex-Sab Exponencial']:.4f}", f"{stats['Média Diferença Sab-Dom Exponencial']:.4f}", 
     f"{proportions['Exponencial']:.4f}"],
    ["Híbrido", f"{stats['Média Diferença Sex-Sab Híbrido']:.4f}", f"{stats['Média Diferença Sab-Dom Híbrido']:.4f}", 
     f"{proportions['Híbrido']:.4f}"]
]

print("ESTATÍSTICAS DE DIFERENÇAS MÉDIAS:")
print(tabulate(stats_table, 
      headers=["Método", "Diff Sex-Sab", "Diff Sab-Dom", "Proporção"],
      tablefmt="grid"))

# Estatísticas gerais
print("\nVISÃO GERAL DOS VALORES DE EFICIÊNCIA PARA TODO O ANO:")
metrics = ['seg_sex_orig', 'seg_sab_orig', 'seg_dom_orig', 
           'seg_sex_exp', 'seg_sab_exp', 'seg_dom_exp',
           'seg_sex_hyb', 'seg_sab_hyb', 'seg_dom_hyb']

general_stats = df_results[metrics].describe()
print(general_stats.round(4))

# =========================================================
# VISUALIZAÇÕES
# =========================================================

# Configuração para gráficos
plt.style.use('ggplot')
fig = plt.figure(figsize=(16, 12))

# Gráfico 1: Comparação dos métodos para casos específicos
plt.subplot(2, 2, 1)
labels = ['Segunda-Sexta', 'Segunda-Sábado', 'Segunda-Domingo']

original_values = [
    specific_results['Segunda a Sexta (5+0)']['original'],
    specific_results['Segunda a Sábado (5+1)']['original'],
    specific_results['Segunda a Domingo (5+2)']['original']
]

exp_values = [
    specific_results['Segunda a Sexta (5+0)']['exponencial'],
    specific_results['Segunda a Sábado (5+1)']['exponencial'],
    specific_results['Segunda a Domingo (5+2)']['exponencial']
]

hybrid_values = [
    specific_results['Segunda a Sexta (5+0)']['hibrido'],
    specific_results['Segunda a Sábado (5+1)']['hibrido'],
    specific_results['Segunda a Domingo (5+2)']['hibrido']
]

x = np.arange(len(labels))
width = 0.25

plt.bar(x - width, original_values, width, label='Original', color='#FF6F61')
plt.bar(x, exp_values, width, label='Exponencial', color='#6B5B95')
plt.bar(x + width, hybrid_values, width, label='Híbrido', color='#88B04B')

plt.xlabel('Tipo de Período')
plt.ylabel('Eficiência')
plt.title('Comparação das Abordagens de Cálculo de Eficiência')
plt.xticks(x, labels)
plt.legend()
plt.grid(axis='y', linestyle='--', alpha=0.7)

# Gráfico 2: Distribuição das diferenças ao longo do ano
plt.subplot(2, 2, 2)
plt.boxplot([
    df_results['diff_sex_sab_orig'],
    df_results['diff_sab_dom_orig'],
    df_results['diff_sex_sab_exp'],
    df_results['diff_sab_dom_exp'],
    df_results['diff_sex_sab_hyb'],
    df_results['diff_sab_dom_hyb']
], labels=[
    'Orig Sex-Sab', 
    'Orig Sab-Dom', 
    'Exp Sex-Sab', 
    'Exp Sab-Dom', 
    'Hyb Sex-Sab', 
    'Hyb Sab-Dom'
])
plt.xticks(rotation=45)
plt.title('Distribuição das Diferenças ao Longo do Ano')
plt.ylabel('Diferença de Eficiência')
plt.grid(axis='y', linestyle='--', alpha=0.7)

# Gráfico 3: Comparação das diferenças para penalidade por dia 
plt.subplot(2, 2, 3)
diff_comparison = {
    'Original': [specific_differences['Original 5+0 vs 5+1'], specific_differences['Original 5+1 vs 5+2']],
    'Exponencial': [specific_differences['Exponencial 5+0 vs 5+1'], specific_differences['Exponencial 5+1 vs 5+2']],
    'Híbrido': [specific_differences['Híbrido 5+0 vs 5+1'], specific_differences['Híbrido 5+1 vs 5+2']]
}

df_diff = pd.DataFrame(diff_comparison, index=['Primeiro dia não útil', 'Segundo dia não útil'])
df_diff.plot(kind='bar', rot=0, ax=plt.gca())
plt.title('Comparação das Penalidades por Dia')
plt.ylabel('Diferença de Eficiência')
plt.grid(axis='y', linestyle='--', alpha=0.7)

# Gráfico 4: Evolução da eficiência ao longo do ano
plt.subplot(2, 2, 4)
plt.plot(df_results['week_start'], df_results['seg_sex_hyb'], label='Seg-Sex Híbrido', color='green', linewidth=2)
plt.plot(df_results['week_start'], df_results['seg_sab_hyb'], label='Seg-Sab Híbrido', color='blue', linewidth=2)
plt.plot(df_results['week_start'], df_results['seg_dom_hyb'], label='Seg-Dom Híbrido', color='red', linewidth=2)
plt.xlabel('Semana do Ano')
plt.ylabel('Eficiência (Método Híbrido)')
plt.title('Evolução da Eficiência ao Longo de 2025')
plt.legend()
plt.grid(True, linestyle='--', alpha=0.7)

plt.tight_layout()
plt.savefig('analise_eficiencia_hibrida.png')
plt.show()

# =========================================================
# CONCLUSÃO E RECOMENDAÇÃO
# =========================================================

print("\n" + "="*80)
print("CONCLUSÃO E RECOMENDAÇÃO SOBRE MÉTODO HÍBRIDO")
print("="*80)

print("\nApós análise detalhada dos três métodos de cálculo de eficiência (Original, Exponencial e Híbrido), conclui-se que:\n")

print("1. O método ORIGINAL mantém o problema já identificado:")
print("   - Diferenciação insuficiente entre períodos com diferentes quantidades de dias não úteis")
print("   - A diferença entre 5+1 e 5+2 é muito pequena (cerca de 0.01) comparada à diferença entre 5+0 e 5+1 (cerca de 0.25)\n")

print("2. O método EXPONENCIAL cria uma diferenciação mais expressiva:")
print("   - Penalização significativa para o primeiro dia desperdiçado")
print("   - Penalização crescente para dias adicionais")
print("   - Mantém consistência ao longo do ano\n")

print("3. O método HÍBRIDO oferece a melhor solução:")
print("   - Cria uma penalização inicial mais substancial para o primeiro dia desperdiçado (0.35 vs 0.30)")
print("   - Implementa um crescimento mais acentuado para dias adicionais (fator 1.8 vs 1.5)")
print("   - Mantém valores de eficiência dentro de uma escala compatível com o sistema original")
print("   - Produz uma diferenciação mais intuitiva e equilibrada entre diferentes níveis de desperdício\n")

print("A abordagem HÍBRIDA apresenta as seguintes vantagens específicas:")
print("1. Penalização mais acentuada para o primeiro dia desperdiçado, criando uma demarcação clara")
print("2. Crescimento mais rápido da penalidade para dias adicionais, refletindo melhor o custo de oportunidade real")
print("3. Melhor proporção entre as diferenças de períodos com 1 ou 2 dias desperdiçados\n")

print("RECOMENDAÇÃO FINAL:\n")

print("Implementar o método HÍBRIDO no sistema de cálculo de eficiência:\n")

print("""```typescript
// Abordagem híbrida com penalização mais inteligente por dia desperdiçado
let wastePenalty = 0;
const nonWorkDays = weekendDays + holidayDays;

if (nonWorkDays > 0) {
  // Penalização para o primeiro dia não-útil (mais substancial)
  const firstDayPenalty = 0.35;
  
  if (nonWorkDays == 1) {
    wastePenalty = firstDayPenalty;
  } else {
    // Primeiro dia tem penalidade fixa maior
    // Dias adicionais têm penalidade incremental com taxa de crescimento mais acentuada
    let additionalDays = nonWorkDays - 1;
    let additionalPenalty = 0;
    
    for (let i = 0; i < additionalDays; i++) {
      // Cada dia adicional tem penalidade 80% maior que o anterior
      additionalPenalty += firstDayPenalty * Math.pow(1.8, i);
    }
    
    wastePenalty = firstDayPenalty + additionalPenalty;
  }
}
```""")
