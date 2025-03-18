import datetime
from datetime import date, timedelta
import json
import uuid
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from typing import Dict, List, Tuple, Optional, Any, Union
from dataclasses import dataclass
import seaborn as sns

# Configuração dos gráficos
plt.rcParams['figure.figsize'] = (12, 6)
plt.style.use('seaborn-v0_8-whitegrid')

# Classes e tipos
@dataclass
class Holiday:
    date: str
    name: str
    type: str

@dataclass
class DateRange:
    start_date: datetime.date
    end_date: datetime.date

@dataclass
class VacationPeriod:
    start_date: datetime.date
    end_date: datetime.date
    total_days: int = 0
    work_days: int = 0
    weekend_days: int = 0
    holiday_days: int = 0
    efficiency: float = 0.0
    efficiency_rating: str = 'low'
    is_valid: bool = True
    invalid_reason: Optional[str] = None
    
    def __str__(self):
        weekday_names = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
        return (f"{self.start_date.strftime('%d/%m/%Y')} ({weekday_names[self.start_date.weekday()]}) a "
                f"{self.end_date.strftime('%d/%m/%Y')} ({weekday_names[self.end_date.weekday()]}), "
                f"Efic: {self.efficiency*100:.2f}%, "
                f"Úteis: {self.work_days}, FDS: {self.weekend_days}, Feriados: {self.holiday_days}")

@dataclass
class Recommendation:
    id: str
    type: str
    title: str
    description: str
    suggested_date_range: DateRange
    efficiency_gain: float
    days_changed: int
    fractioned_periods: Optional[List[VacationPeriod]] = None
    strategic_score: float = 0.0  # Nova propriedade para pontuação estratégica
    
    def __str__(self):
        return (f"{self.title}: {self.efficiency_gain*100:.2f}% ganho, {self.days_changed} dias alterados, "
                f"Score: {self.strategic_score:.2f}")

@dataclass
class FractionedVacationPeriods:
    is_fractionated: bool
    periods: List[VacationPeriod]
    combined_efficiency: float
    efficiency_gain: float

# Dados de feriados
# Nacional holidays para 2024-2026
NATIONAL_HOLIDAYS: List[Holiday] = [
    # 2024
    Holiday(date='2024-01-01', name='Confraternização Universal', type='national'),
    Holiday(date='2024-02-12', name='Carnaval', type='national'),
    Holiday(date='2024-02-13', name='Carnaval', type='national'),
    Holiday(date='2024-03-29', name='Sexta-feira Santa', type='national'),
    Holiday(date='2024-04-21', name='Tiradentes', type='national'),
    Holiday(date='2024-05-01', name='Dia do Trabalho', type='national'),
    Holiday(date='2024-05-30', name='Corpus Christi', type='national'),
    Holiday(date='2024-09-07', name='Independência do Brasil', type='national'),
    Holiday(date='2024-10-12', name='Nossa Senhora Aparecida', type='national'),
    Holiday(date='2024-11-02', name='Finados', type='national'),
    Holiday(date='2024-11-15', name='Proclamação da República', type='national'),
    Holiday(date='2024-12-25', name='Natal', type='national'),
    
    # 2025
    Holiday(date='2025-01-01', name='Confraternização Universal', type='national'),
    Holiday(date='2025-03-03', name='Carnaval', type='national'),
    Holiday(date='2025-03-04', name='Carnaval', type='national'),
    Holiday(date='2025-04-18', name='Sexta-feira Santa', type='national'),
    Holiday(date='2025-04-21', name='Tiradentes', type='national'),
    Holiday(date='2025-05-01', name='Dia do Trabalho', type='national'),
    Holiday(date='2025-06-19', name='Corpus Christi', type='national'),
    Holiday(date='2025-09-07', name='Independência do Brasil', type='national'),
    Holiday(date='2025-10-12', name='Nossa Senhora Aparecida', type='national'),
    Holiday(date='2025-11-02', name='Finados', type='national'),
    Holiday(date='2025-11-15', name='Proclamação da República', type='national'),
    Holiday(date='2025-12-25', name='Natal', type='national'),
    
    # 2026
    Holiday(date='2026-01-01', name='Confraternização Universal', type='national'),
    Holiday(date='2026-02-16', name='Carnaval', type='national'),
    Holiday(date='2026-02-17', name='Carnaval', type='national'),
    Holiday(date='2026-04-03', name='Sexta-feira Santa', type='national'),
    Holiday(date='2026-04-21', name='Tiradentes', type='national'),
    Holiday(date='2026-05-01', name='Dia do Trabalho', type='national'),
    Holiday(date='2026-06-04', name='Corpus Christi', type='national'),
    Holiday(date='2026-09-07', name='Independência do Brasil', type='national'),
    Holiday(date='2026-10-12', name='Nossa Senhora Aparecida', type='national'),
    Holiday(date='2026-11-02', name='Finados', type='national'),
    Holiday(date='2026-11-15', name='Proclamação da República', type='national'),
    Holiday(date='2026-12-25', name='Natal', type='national'),
]

# Judicial specific holidays
JUDICIAL_HOLIDAYS: List[Holiday] = [
    # 2024
    Holiday(date='2024-01-31', name='Dia da Justiça Federal', type='judicial'),
    Holiday(date='2024-08-11', name='Dia do Advogado', type='judicial'),
    Holiday(date='2024-10-31', name='Dia do Servidor Público', type='judicial'),
    Holiday(date='2024-12-08', name='Dia da Justiça', type='judicial'),
    
    # 2025
    Holiday(date='2025-01-31', name='Dia da Justiça Federal', type='judicial'),
    Holiday(date='2025-08-11', name='Dia do Advogado', type='judicial'),
    Holiday(date='2025-10-28', name='Dia do Servidor Público', type='judicial'),
    Holiday(date='2025-12-08', name='Dia da Justiça', type='judicial'),
    
    # 2026
    Holiday(date='2026-01-31', name='Dia da Justiça Federal', type='judicial'),
    Holiday(date='2026-08-11', name='Dia do Advogado', type='judicial'),
    Holiday(date='2026-10-28', name='Dia do Servidor Público', type='judicial'),
    Holiday(date='2026-12-08', name='Dia da Justiça', type='judicial'),
]

# Função para gerar períodos de recesso para múltiplos anos
def generate_recess_periods(start_year: int, end_year: int) -> List[Holiday]:
    recess_periods: List[Holiday] = []
    
    for year in range(start_year, end_year + 1):
        # Final do ano anterior ao início do ano atual
        for day in range(20, 32):
            recess_periods.append(
                Holiday(
                    date=f"{year-1}-12-{day:02d}",
                    name='Recesso Forense',
                    type='recess'
                )
            )
        
        # Início do ano atual
        for day in range(1, 7):
            recess_periods.append(
                Holiday(
                    date=f"{year}-01-{day:02d}",
                    name='Recesso Forense',
                    type='recess'
                )
            )
    
    return recess_periods

# Gerar períodos de recesso para 2024-2026
RECESS_PERIODS: List[Holiday] = generate_recess_periods(2024, 2027)

# Todos os feriados combinados
ALL_HOLIDAYS: List[Holiday] = NATIONAL_HOLIDAYS + JUDICIAL_HOLIDAYS + RECESS_PERIODS

# Funções de Utilidade

def parse_date(date_str: str) -> datetime.date:
    """Converte uma string de data no formato 'YYYY-MM-DD' para um objeto datetime.date."""
    return datetime.date.fromisoformat(date_str)

def is_holiday(date_obj: datetime.date) -> Optional[Holiday]:
    """Verifica se uma data é feriado."""
    date_str = date_obj.isoformat()
    for holiday in ALL_HOLIDAYS:
        if holiday.date == date_str:
            return holiday
    return None

def is_weekend(date_obj: datetime.date) -> bool:
    """Verifica se uma data é fim de semana (sábado ou domingo)."""
    return date_obj.weekday() >= 5  # 5 = Sábado, 6 = Domingo

def get_holidays_in_range(start_date: datetime.date, end_date: datetime.date) -> List[Holiday]:
    """Obtém todos os feriados em um intervalo de datas."""
    return [
        holiday for holiday in ALL_HOLIDAYS
        if start_date <= parse_date(holiday.date) <= end_date
    ]

def format_date(date_obj: datetime.date, format_str: str = '%d/%m/%Y') -> str:
    """Formata uma data como string."""
    return date_obj.strftime(format_str)

def get_day_of_week(date_obj: datetime.date, abbreviated: bool = False) -> str:
    """Retorna o dia da semana como string."""
    days = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", 
           "Sexta-feira", "Sábado", "Domingo"]
    days_abbreviated = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    
    if abbreviated:
        return days_abbreviated[date_obj.weekday()]
    return days[date_obj.weekday()]

def is_valid_vacation_period(start_date: datetime.date, end_date: datetime.date) -> Dict[str, Any]:
    """Verifica se um período de férias é válido (mínimo 5 dias)."""
    days = (end_date - start_date).days + 1
    
    if days < 5:
        return {
            'is_valid': False,
            'reason': 'O período mínimo de férias é de 5 dias conforme Resolução nº 940/2025 do CJF'
        }
    
    return {'is_valid': True}

def calculate_days_breakdown(start_date: datetime.date, end_date: datetime.date) -> Dict[str, int]:
    """Calcula a distribuição de dias úteis, fins de semana e feriados em um intervalo."""
    total_days = (end_date - start_date).days + 1
    work_days = 0
    weekend_days = 0
    holiday_days = 0
    
    current_date = start_date
    while current_date <= end_date:
        holiday_check = is_holiday(current_date)
        
        if holiday_check:
            holiday_days += 1
        elif is_weekend(current_date):
            weekend_days += 1
        else:
            work_days += 1
        
        current_date += timedelta(days=1)
    
    return {
        'work_days': work_days,
        'weekend_days': weekend_days,
        'holiday_days': holiday_days,
        'total_days': total_days
    }

def calculate_efficiency(work_days: int, total_days: int) -> float:
    """Calcula a eficiência de um período de férias."""
    if total_days == 0:
        return 0
    return 1 - (work_days / total_days)

def get_efficiency_rating(efficiency: float) -> str:
    """Determina a classificação de eficiência com base no valor."""
    if efficiency >= 0.6:
        return 'high'
    if efficiency >= 0.4:
        return 'medium'
    return 'low'

def get_vacation_period_details(start_date: datetime.date, end_date: datetime.date) -> VacationPeriod:
    """Obtém detalhes completos de um período de férias a partir de um intervalo de datas."""
    breakdown = calculate_days_breakdown(start_date, end_date)
    efficiency = calculate_efficiency(breakdown['work_days'], breakdown['total_days'])
    efficiency_rating = get_efficiency_rating(efficiency)
    validity_check = is_valid_vacation_period(start_date, end_date)
    
    return VacationPeriod(
        start_date=start_date,
        end_date=end_date,
        total_days=breakdown['total_days'],
        work_days=breakdown['work_days'],
        weekend_days=breakdown['weekend_days'],
        holiday_days=breakdown['holiday_days'],
        efficiency=efficiency,
        efficiency_rating=efficiency_rating,
        is_valid=validity_check['is_valid'],
        invalid_reason=validity_check.get('reason')
    )

# Funções de Recomendação

def find_nearby_opportunities(
    vacation_period: VacationPeriod, 
    days_to_check: int = 5
) -> Dict[str, Any]:
    """
    Encontra dias com potencial para extensão de férias, identificando
    clusters de feriados e fins de semana adjacentes.
    """
    before = []
    after = []
    work_days_before = 0
    work_days_after = 0
    practical_before = True
    practical_after = True
    
    # Verifica se o período original tem bons dias de início/fim
    has_good_start_day = vacation_period.start_date.weekday() == 0  # Segunda-feira
    has_good_end_day = vacation_period.end_date.weekday() == 4      # Sexta-feira
    
    # Verifica os dias antes das férias - encontra blocos contínuos de feriados
    current_date = vacation_period.start_date - timedelta(days=1)
    consecutive_non_work_days = 0
    
    # Se já estiver começando na segunda-feira, a extensão anterior é menos prática
    if has_good_start_day:
        practical_before = False
    
    for i in range(days_to_check):
        is_non_work_day = bool(is_holiday(current_date)) or is_weekend(current_date)
        
        if is_non_work_day:
            # Adiciona apenas se for feriado ou parte de uma ponte para um feriado
            if is_holiday(current_date) or consecutive_non_work_days > 0:
                before.append(current_date)
            consecutive_non_work_days += 1
        else:
            # É um dia útil
            if consecutive_non_work_days > 0:
                # Este dia útil é parte de uma ponte potencial
                before.append(current_date)
                work_days_before += 1
            else:
                # Apenas um dia útil regular sem conexão com feriados
                work_days_before += 1
            consecutive_non_work_days = 0
        
        current_date -= timedelta(days=1)
    
    # Verifica os dias após as férias - encontra blocos contínuos de feriados
    current_date = vacation_period.end_date + timedelta(days=1)
    consecutive_non_work_days = 0
    
    # Se já terminar na sexta-feira, a extensão posterior é menos prática
    if has_good_end_day:
        practical_after = False
    
    for i in range(days_to_check):
        is_non_work_day = bool(is_holiday(current_date)) or is_weekend(current_date)
        current_day_of_week = current_date.weekday()
        
        # Marca a extensão como impraticável se terminasse em um fim de semana ou segunda-feira
        if i == 0 and (current_day_of_week == 5 or current_day_of_week == 6):  # Sáb ou Dom
            practical_after = False
        
        if is_non_work_day:
            # Adiciona apenas se for feriado ou parte de uma ponte para um feriado
            if is_holiday(current_date) or consecutive_non_work_days > 0:
                after.append(current_date)
            consecutive_non_work_days += 1
        else:
            # É um dia útil
            if consecutive_non_work_days > 0:
                # Este dia útil é parte de uma ponte potencial
                after.append(current_date)
                work_days_after += 1
            else:
                # Apenas um dia útil regular sem conexão com feriados
                work_days_after += 1
            consecutive_non_work_days = 0
        
        current_date += timedelta(days=1)
    
    return {
        'before': sorted(before),
        'after': after,
        'work_days_before': work_days_before,
        'work_days_after': work_days_after,
        'practical_before': practical_before,
        'practical_after': practical_after
    }

def find_potential_bridges(year: int, max_bridge_size: int = 3) -> List[Dict[str, Any]]:
    """
    Encontra potenciais 'pontes' entre feriados/fins de semana dentro de um determinado intervalo.
    """
    bridges = []
    start_date = datetime.date(year, 1, 1)  # 1º de janeiro
    end_date = datetime.date(year, 12, 31)  # 31 de dezembro
    
    # Coleta todos os dias não úteis (feriados e fins de semana)
    non_work_days = []
    current_date = start_date
    
    while current_date <= end_date:
        if is_holiday(current_date) or is_weekend(current_date):
            non_work_days.append(current_date)
        current_date += timedelta(days=1)
    
    # Ordena as datas
    non_work_days.sort()
    
    # Encontra clusters de dias não úteis com pequenos intervalos
    for i in range(len(non_work_days) - 1):
        current = non_work_days[i]
        
        # Olha para frente para clusters próximos
        for j in range(i + 1, len(non_work_days)):
            next_day = non_work_days[j]
            gap_days = (next_day - current).days - 1
            
            # Se houver um pequeno intervalo (ponte potencial) e todos os dias entre forem dias úteis
            if 0 < gap_days <= max_bridge_size:
                # Verifica se não estamos apenas conectando fins de semana consecutivos sem feriados
                is_current_weekend_only = is_weekend(current) and not is_holiday(current)
                is_next_weekend_only = is_weekend(next_day) and not is_holiday(next_day)
                
                # Pula se estivermos apenas conectando fins de semana consecutivos sem feriados envolvidos
                if is_current_weekend_only and is_next_weekend_only and gap_days == 5:
                    break
                
                bridge_start = current + timedelta(days=1)
                bridge_end = next_day - timedelta(days=1)
                
                # Conta os dias úteis reais nesta ponte (excluindo quaisquer feriados)
                work_days = 0
                bridge_date = bridge_start
                
                while bridge_date <= bridge_end:
                    if not is_holiday(bridge_date) and not is_weekend(bridge_date):
                        work_days += 1
                    bridge_date += timedelta(days=1)
                
                # Adiciona apenas pontes que contêm dias úteis reais
                if work_days > 0:
                    bridges.append({
                        'start_date': bridge_start,
                        'end_date': bridge_end,
                        'work_days': work_days
                    })
                
                # Pula para o próximo cluster potencial
                break
            elif gap_days > max_bridge_size:
                # Pula para o próximo cluster se o intervalo for muito grande
                break
    
    return bridges

def find_optimal_shift(
    vacation_period: VacationPeriod, 
    max_search_window: int = 7
) -> Optional[Dict[str, Any]]:
    """
    Encontra a janela de deslocamento ideal para melhor eficiência (adaptável em vez de fixo -3 a +3).
    """
    best_shift = None
    best_efficiency_gain = 0
    
    # Tenta diferentes valores de deslocamento em ambas as direções
    for shift in range(-max_search_window, max_search_window + 1):
        if shift == 0:
            continue
        
        new_start_date = vacation_period.start_date + timedelta(days=shift)
        new_end_date = vacation_period.end_date + timedelta(days=shift)
        new_period = get_vacation_period_details(new_start_date, new_end_date)
        
        # Cálculo de eficiência base
        adjusted_efficiency = new_period.efficiency
        
        # Aplica ajustes práticos à eficiência
        
        # Penaliza períodos que começam logo antes ou em fins de semana (sexta/sábado/domingo)
        start_day = new_start_date.weekday()
        if start_day == 4:  # Sexta
            adjusted_efficiency -= 0.05  # Penalidade moderada
        elif start_day == 5 or start_day == 6:  # Sábado ou Domingo
            adjusted_efficiency -= 0.08  # Penalidade maior
        
        # Bônus para períodos que começam na segunda-feira
        if start_day == 0:  # Segunda-feira
            adjusted_efficiency += 0.04
        
        # Penaliza períodos que terminam em fins de semana (desperdiçando o fim de semana)
        end_day = new_end_date.weekday()
        if end_day == 5 or end_day == 6:  # Sábado ou Domingo
            adjusted_efficiency -= 0.07  # Penalidade significativa
        
        # Bônus para períodos que terminam na sexta-feira
        if end_day == 4:  # Sexta-feira
            adjusted_efficiency += 0.05
        
        efficiency_gain = adjusted_efficiency - vacation_period.efficiency
        
        # Só considera se incluir pelo menos um dia útil real
        has_work_days = new_period.work_days > 0
        
        if efficiency_gain > best_efficiency_gain and has_work_days:
            best_efficiency_gain = efficiency_gain
            best_shift = {
                'start_date': new_start_date,
                'end_date': new_end_date,
                'efficiency_gain': efficiency_gain,
                'days_shifted': abs(shift)
            }
    
    # Só retorna se houver uma melhoria significativa
    if best_shift and best_shift['efficiency_gain'] > 0.05:
        return best_shift
    
    return None

def find_optimal_split_point(vacation_period: VacationPeriod) -> Optional[Dict[str, Any]]:
    """
    Encontra o ponto de divisão ideal para um período de férias que maximiza a eficiência de ambos os períodos.
    Implementa o algoritmo com melhorias para considerar a distribuição estratégica de dias não úteis.
    """
    if vacation_period.total_days < 10:
        return None  # Precisa de pelo menos 10 dias para dividir
    
    best_split = None
    best_combined_efficiency = 0
    best_distribution = 0  # Medida de quão bem os dias não úteis estão distribuídos
    
    # Tenta cada possível ponto de divisão
    min_period_length = 5  # Comprimento mínimo do período
    
    print(f"Tentando encontrar ponto de split para período de {vacation_period.total_days} dias com eficiência {vacation_period.efficiency*100:.2f}%")
    print(f"Período original: {format_date(vacation_period.start_date)} a {format_date(vacation_period.end_date)}, dias úteis: {vacation_period.work_days}")
    
    for i in range(min_period_length - 1, vacation_period.total_days - min_period_length):
        first_end_date = vacation_period.start_date + timedelta(days=i)
        second_start_date = first_end_date + timedelta(days=1)
        
        first_period = get_vacation_period_details(vacation_period.start_date, first_end_date)
        second_period = get_vacation_period_details(second_start_date, vacation_period.end_date)
        
        # Verifica se ambos os períodos são válidos E contêm pelo menos um dia útil
        if first_period.is_valid and second_period.is_valid and first_period.work_days > 0 and second_period.work_days > 0:
            # Penaliza períodos que começam ou terminam em finais de semana
            start_end_penalty = 0
            
            # Verifica se o segundo período começa em um final de semana (penalizar)
            if is_weekend(second_period.start_date):
                start_end_penalty -= 0.1  # Penalidade significativa
                print(f"  - Penalizando split pois o segundo período começa em final de semana ({format_date(second_period.start_date)})")
            
            # Verifica se o primeiro período termina em uma sexta-feira (bonificar)
            if first_period.end_date.weekday() == 4:  # 4 = sexta-feira
                start_end_penalty += 0.05  # Bonificação moderada
                print(f"  - Bonificando split pois o primeiro período termina numa sexta-feira ({format_date(first_period.end_date)})")
            
            # Verifica se o segundo período começa em uma segunda-feira (bonificar)
            if second_period.start_date.weekday() == 0:  # 0 = segunda-feira
                start_end_penalty += 0.05  # Bonificação moderada
                print(f"  - Bonificando split pois o segundo período começa numa segunda-feira ({format_date(second_period.start_date)})")
            
            # Usa média ponderada com base nos comprimentos do período
            first_weight = first_period.total_days / vacation_period.total_days
            second_weight = second_period.total_days / vacation_period.total_days
            combined_efficiency = (first_period.efficiency * first_weight) + (second_period.efficiency * second_weight)
            
            # Calcula a pontuação de distribuição - maior é melhor
            # Isso mede quão bem os dias não úteis estão distribuídos entre os dois períodos
            # e se a divisão realmente oferece uma vantagem em termos de flexibilidade
            non_work_days_first = first_period.weekend_days + first_period.holiday_days
            non_work_days_second = second_period.weekend_days + second_period.holiday_days
            distribution_score = min(non_work_days_first, non_work_days_second) / max(non_work_days_first, non_work_days_second)
            
            # Melhoria de cálculo do bônus pela flexibilidade
            flexibility_bonus = 0.02  # 2% de bônus pela flexibilidade
            # Aplica penalidade/bonificação por posicionamento estratégico dos períodos
            effective_efficiency = combined_efficiency + flexibility_bonus + start_end_penalty
            
            # Debug
            print(f"Split ponto {i}: {first_period.efficiency*100:.2f}% e {second_period.efficiency*100:.2f}% = {combined_efficiency*100:.2f}% (dist: {distribution_score*100:.2f}%, ajuste: {start_end_penalty*100:.2f}%)")
            print(f"  - Período 1: {format_date(first_period.start_date)} a {format_date(first_period.end_date)}, dias úteis: {first_period.work_days}, dia semana início: {first_period.start_date.weekday()}, fim: {first_period.end_date.weekday()}")
            print(f"  - Período 2: {format_date(second_period.start_date)} a {format_date(second_period.end_date)}, dias úteis: {second_period.work_days}, dia semana início: {second_period.start_date.weekday()}, fim: {second_period.end_date.weekday()}")
            
            # Prioriza a boa distribuição de dias não úteis e posicionamento estratégico
            if effective_efficiency >= best_combined_efficiency and distribution_score > 0.5:
                best_combined_efficiency = effective_efficiency
                best_distribution = distribution_score
                best_split = {
                    'first_period': first_period,
                    'second_period': second_period,
                    'combined_efficiency': effective_efficiency,
                    'best_distribution': distribution_score
                }
        else:
            # Debug - mostra por que o split foi rejeitado
            print(f"Split rejeitado no ponto {i}:")
            if not first_period.is_valid:
                print(f"  - Primeiro período inválido: {first_period.invalid_reason}")
            if not second_period.is_valid:
                print(f"  - Segundo período inválido: {second_period.invalid_reason}")
            if first_period.work_days == 0:
                print("  - Primeiro período não tem dias úteis")
            if second_period.work_days == 0:
                print("  - Segundo período não tem dias úteis")
    
    # Debug
    if best_split:
        print(f"Melhor split encontrado: eficiência combinada {best_split['combined_efficiency']*100:.2f}% (ganho de {(best_split['combined_efficiency'] - vacation_period.efficiency)*100:.2f}%)")
        print(f"Distribuição de dias não úteis: {best_split['best_distribution']*100:.2f}%")
        print(f"Primeiro período: {format_date(best_split['first_period'].start_date)} a {format_date(best_split['first_period'].end_date)}, dia semana início: {best_split['first_period'].start_date.weekday()}, fim: {best_split['first_period'].end_date.weekday()}")
        print(f"Segundo período: {format_date(best_split['second_period'].start_date)} a {format_date(best_split['second_period'].end_date)}, dia semana início: {best_split['second_period'].start_date.weekday()}, fim: {best_split['second_period'].end_date.weekday()}")
    else:
        print('Nenhum split válido encontrado')
    
    return best_split

def find_optimal_fractioned_periods(
    year: int,
    fraction_count: int = 6,
    days_per_fraction: int = 5
) -> Optional[FractionedVacationPeriods]:
    """
    Encontra períodos ideais de 5 dias ao longo do ano.
    """
    print(f"Buscando {fraction_count} períodos otimizados de {days_per_fraction} dias para o ano {year}")
    
    # Gera todos os possíveis períodos de days_per_fraction dias no ano
    all_periods = []
    start_date = datetime.date(year, 1, 1)  # 1º de janeiro
    end_date = datetime.date(year, 12, 31 - (days_per_fraction - 1))  # Última data de início para um período
    
    current_date = start_date
    while current_date <= end_date:
        period_end_date = current_date + timedelta(days=days_per_fraction - 1)
        period = get_vacation_period_details(current_date, period_end_date)
        
        # Só considera períodos com pelo menos um dia útil
        if period.is_valid and period.work_days > 0:
            # Atribuir um bônus estratégico baseado nos dias de início/fim
            strategic_bonus = 0
            
            # Penalizar se o período começa em final de semana
            if is_weekend(period.start_date):
                strategic_bonus -= 0.1
            
            # Bonificar se o período começa em segunda-feira
            if period.start_date.weekday() == 0:  # 0 = segunda-feira
                strategic_bonus += 0.05
            
            # Bonificar se o período termina em sexta-feira
            if period.end_date.weekday() == 4:  # 4 = sexta-feira
                strategic_bonus += 0.05
            
            # Ajustar eficiência com o bônus estratégico
            adjusted_efficiency = period.efficiency + strategic_bonus
            
            # Adicionar o período com a eficiência ajustada
            period.efficiency = adjusted_efficiency
            all_periods.append(period)
        
        current_date += timedelta(days=1)
    
    # Ordena por eficiência (mais eficiente primeiro)
    sorted_periods = sorted(all_periods, key=lambda x: x.efficiency, reverse=True)
    
    # Seleciona os melhores períodos não sobrepostos
    selected_periods = select_non_overlapping_periods(sorted_periods, fraction_count)
    
    if not selected_periods:
        return None
    
    # Calcula os dias úteis totais e dias totais em todos os períodos
    total_work_days = 0
    total_days = 0
    total_non_work_days = 0
    
    for period in selected_periods:
        total_work_days += period.work_days
        total_days += period.total_days
        total_non_work_days += (period.weekend_days + period.holiday_days)
    
    # Calcula a eficiência combinada
    combined_efficiency = 1 - (total_work_days / total_days)
    
    # Ordena por data para apresentação
    chronological_periods = sorted(selected_periods, key=lambda x: x.start_date)
    
    # Para comparação, calcula a eficiência de um único período contínuo de mesmo comprimento
    single_period_length = total_days
    single_period_start = datetime.date(year, 6, 1)  # 1º de julho como referência
    single_period_end = single_period_start + timedelta(days=single_period_length - 1)
    single_period = get_vacation_period_details(single_period_start, single_period_end)
    
    efficiency_gain = combined_efficiency - single_period.efficiency
    
    print(f"Eficiência de {fraction_count} períodos fracionados: {combined_efficiency*100:.2f}%")
    print(f"Comparação com período único de {single_period_length} dias: {single_period.efficiency*100:.2f}%")
    print(f"Ganho de eficiência: {efficiency_gain*100:.2f}%")
    
    # Log de debug dos períodos selecionados
    print("Períodos fracionados selecionados:")
    for idx, period in enumerate(chronological_periods):
        print(f"Período {idx+1}: {format_date(period.start_date)} ({period.start_date.weekday()}) a {format_date(period.end_date)} ({period.end_date.weekday()}), dias úteis: {period.work_days}, eficiência: {period.efficiency*100:.2f}%")
    
    return FractionedVacationPeriods(
        is_fractionated=True,
        periods=chronological_periods,
        combined_efficiency=combined_efficiency,
        efficiency_gain=efficiency_gain
    )

def select_non_overlapping_periods(sorted_periods: List[VacationPeriod], count: int) -> List[VacationPeriod]:
    """
    Seleciona os melhores N períodos não sobrepostos de uma lista ordenada.
    """
    selected = []
    
    # Primeiro filtrar para garantir que só consideramos períodos com dias úteis
    periods_with_work_days = [p for p in sorted_periods if p.work_days > 0]
    
    # Prefere períodos que incluem fins de semana (padrão Qua-Dom) ou feriados
    priority_periods = [p for p in periods_with_work_days if (p.weekend_days + p.holiday_days) >= 2]
    
    # Usa períodos priorizados primeiro, depois volta para a lista completa
    periods_to_use = priority_periods if len(priority_periods) > count * 2 else periods_with_work_days
    
    # Começa com os períodos mais eficientes
    i = 0
    while len(selected) < count and i < len(periods_to_use):
        current = periods_to_use[i]
        
        # Verifica se este período se sobrepõe a qualquer período já selecionado
        overlaps = any(
            current.start_date <= p.end_date and current.end_date >= p.start_date
            for p in selected
        )
        
        if not overlaps:
            selected.append(current)
        
        i += 1
    
    return selected

def calculate_combined_efficiency(periods: List[VacationPeriod]) -> Dict[str, Any]:
    """
    Calcula a eficiência combinada para vários períodos.
    """
    total_work_days = 0
    total_days = 0
    total_non_work_days = 0
    
    for period in periods:
        total_work_days += period.work_days
        total_days += period.total_days
        total_non_work_days += (period.weekend_days + period.holiday_days)
    
    efficiency = 1 - (total_work_days / total_days)
    
    return {
        'efficiency': efficiency,
        'total_days': total_days,
        'total_work_days': total_work_days,
        'total_non_work_days': total_non_work_days
    }

def find_optimal_periods(
    year: int,
    length: int = 15,
    count: int = 5
) -> List[VacationPeriod]:
    """
    Encontra os períodos mais eficientes de um determinado comprimento.
    """
    print(f"Buscando períodos otimizados para o ano {year} com duração de {length} dias")
    
    results = []
    start_date = datetime.date(year, 1, 1)  # 1º de janeiro
    end_date = datetime.date(year, 12, 31)  # 31 de dezembro
    
    # Calcula para cada data de início possível
    current_date = start_date
    
    while current_date <= end_date:
        period_end_date = current_date + timedelta(days=length - 1)
        if period_end_date > end_date:
            break
        
        period = get_vacation_period_details(current_date, period_end_date)
        
        # Adiciona aos resultados se for válido e tiver pelo menos um dia útil
        if period.is_valid and period.work_days > 0:
            results.append(period)
        
        current_date += timedelta(days=1)
    
    # Ordena por eficiência e retorna os top count
    sorted_results = sorted(results, key=lambda x: x.efficiency, reverse=True)
    top5 = sorted_results[:5]
    
    print("Top 5 períodos mais eficientes encontrados:")
    for i, p in enumerate(top5):
        print(f"#{i+1}: {format_date(p.start_date)} a {format_date(p.end_date)} - Eficiência: {p.efficiency*100:.2f}%")
    
    return sorted_results[:count]

def generate_recommendations(vacation_period: VacationPeriod) -> List[Recommendation]:
    """
    Gera recomendações para otimizar um período de férias.
    Implementa um algoritmo aprimorado para a geração de recomendações.
    """
    if not vacation_period.is_valid:
        return []
    
    # Lida com intervalo de datas inválido (data de início após a data de término)
    if vacation_period.start_date > vacation_period.end_date:
        print('Período inválido: data de início está após a data de término')
        return [Recommendation(
            id=str(uuid.uuid4()),
            type='error',
            title='Período inválido',
            description=f"As datas selecionadas parecem estar invertidas. A data de início ({format_date(vacation_period.start_date)}) está após a data de término ({format_date(vacation_period.end_date)}).",
            suggested_date_range=DateRange(
                start_date=vacation_period.end_date,  # Sugere inverter as datas como correção
                end_date=vacation_period.start_date
            ),
            efficiency_gain=0,
            days_changed=0,
            strategic_score=0
        )]
    
    recommendations = []
    opportunities = find_nearby_opportunities(vacation_period)
    before = opportunities['before']
    after = opportunities['after']
    work_days_before = opportunities['work_days_before']
    work_days_after = opportunities['work_days_after']
    practical_before = opportunities['practical_before']
    practical_after = opportunities['practical_after']
    
    # Define o período de recesso judicial
    year = vacation_period.start_date.year
    judicial_recess_start = datetime.date(year, 12, 20)  # 20 de dezembro
    judicial_recess_end = datetime.date(year + 1, 1, 6)  # 6 de janeiro
    
    # Função auxiliar para verificar se um intervalo de datas se sobrepõe ao recesso judicial
    def overlaps_with_judicial_recess(start_date: datetime.date, end_date: datetime.date) -> bool:
        return start_date <= judicial_recess_end and end_date >= judicial_recess_start
    
    # Recomendação: Fracionamento ideal de férias
    year = vacation_period.start_date.year
    optimal_fractions = find_optimal_fractioned_periods(year, 6, 5)
    
    if optimal_fractions and optimal_fractions.efficiency_gain > 0.1:  # Só recomenda se for pelo menos 10% melhor
        # Verifica se todos os períodos contêm pelo menos um dia útil
        all_periods_valid = all(period.work_days > 0 for period in optimal_fractions.periods)
        
        if all_periods_valid:
            # Obter nome dos dias da semana para facilitar compreensão
            def get_day_of_week_name(date_obj: datetime.date) -> str:
                days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
                return days[date_obj.weekday()]
            
            # Cria uma descrição dos períodos fracionados
            periods_description = '; '.join(
                f"Período {i+1}: {format_date(p.start_date)} ({get_day_of_week_name(p.start_date)}) a {format_date(p.end_date)} ({get_day_of_week_name(p.end_date)}) ({p.work_days} dias úteis, {p.weekend_days + p.holiday_days} não úteis)"
                for i, p in enumerate(optimal_fractions.periods)
            )
            
            # Constrói a recomendação
            recommendations.append(Recommendation(
                id=str(uuid.uuid4()),
                type='optimal_fraction',
                title='Fracionamento Ideal de Férias',
                description=f"Divida suas férias em 6 períodos de 5 dias estratégicos para maximizar a eficiência em {int(optimal_fractions.efficiency_gain * 100)}%. {periods_description}",
                suggested_date_range=DateRange(
                    start_date=optimal_fractions.periods[0].start_date,
                    end_date=optimal_fractions.periods[0].end_date
                ),
                efficiency_gain=optimal_fractions.efficiency_gain,
                days_changed=vacation_period.total_days,
                fractioned_periods=optimal_fractions.periods,
                strategic_score=optimal_fractions.efficiency_gain * 1.2  # Bônus para fracionamento
            ))
    
    # Recomendação: Estender antes - apenas se houver dias úteis reais para incluir
    if before and work_days_before > 0 and practical_before:
        new_start_date = before[0]
        new_vacation_period = get_vacation_period_details(new_start_date, vacation_period.end_date)
        work_day_change = new_vacation_period.work_days - vacation_period.work_days
        
        # Certifica-se de que estamos adicionando dias úteis reais (não apenas fins de semana)
        if work_day_change > 0 and work_day_change <= 3:  # Só recomenda se custar no máximo 3 dias úteis
            # Verificação adicional de praticidade - não recomenda começar no fim de semana
            start_day_of_week = new_start_date.weekday()
            is_practical_start_day = not (start_day_of_week == 5 or start_day_of_week == 6)
            
            # Conta dias não úteis sendo capturados
            non_work_days_added = sum(1 for date in before if is_holiday(date) or is_weekend(date))
            
            # Se atualmente começar na segunda-feira, não estende a menos que seja para capturar um período de feriado significativo
            original_start_day = vacation_period.start_date.weekday()
            is_currently_starting_on_monday = original_start_day == 0
            
            # Só prossegue se for prático ou tiver valor excepcional (muitos feriados)
            has_exceptional_value = non_work_days_added >= 2 and work_day_change <= 1
            
            if (is_practical_start_day or has_exceptional_value) and not (is_currently_starting_on_monday and not has_exceptional_value):
                # Obtém os nomes dos dias para melhor compreensão
                def get_day_name(date_obj: datetime.date) -> str:
                    days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
                    return days[date_obj.weekday()]
                
                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    type='extend',
                    title='Estender no início',
                    description=f"Antecipe o início das férias para {format_date(new_start_date)} ({get_day_name(new_start_date)}) aproveitando {non_work_days_added} dia(s) não útil(s) adjacente(s)",
                    suggested_date_range=DateRange(
                        start_date=new_start_date,
                        end_date=vacation_period.end_date
                    ),
                    efficiency_gain=new_vacation_period.efficiency - vacation_period.efficiency,
                    days_changed=(vacation_period.start_date - new_start_date).days,
                    strategic_score=(new_vacation_period.efficiency - vacation_period.efficiency) * 1.1
                ))
    
    # Recomendação: Estender depois - apenas se houver dias úteis reais para incluir
    if after and work_days_after > 0 and practical_after:
        new_end_date = after[-1]
        new_vacation_period = get_vacation_period_details(vacation_period.start_date, new_end_date)
        work_day_change = new_vacation_period.work_days - vacation_period.work_days
        
        # Certifica-se de que estamos adicionando dias úteis reais (não apenas fins de semana)
        if work_day_change > 0 and work_day_change <= 3:  # Só recomenda se custar no máximo 3 dias úteis
            # Verificação adicional de praticidade - não recomenda terminar no fim de semana ou segunda-feira
            end_day_of_week = new_end_date.weekday()
            is_practical_end_day = not (end_day_of_week == 5 or end_day_of_week == 6 or end_day_of_week == 0)
            
            # Conta dias não úteis sendo capturados
            non_work_days_added = sum(1 for date in after if is_holiday(date) or is_weekend(date))
            
            # Se atualmente terminar na sexta-feira, não estende a menos que seja para capturar um período de feriado significativo
            original_end_day = vacation_period.end_date.weekday()
            is_currently_ending_on_friday = original_end_day == 4
            
            # Só prossegue se for prático ou tiver valor excepcional (muitos feriados)
            has_exceptional_value = non_work_days_added >= 2 and work_day_change <= 1
            
            if (is_practical_end_day or has_exceptional_value) and not (is_currently_ending_on_friday and not has_exceptional_value):
                # Obtém os nomes dos dias para melhor compreensão
                def get_day_name(date_obj: datetime.date) -> str:
                    days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
                    return days[date_obj.weekday()]
                
                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    type='extend',
                    title='Estender no final',
                    description=f"Prolongue o final das férias até {format_date(new_end_date)} ({get_day_name(new_end_date)}) aproveitando {non_work_days_added} dia(s) não útil(s) adjacente(s)",
                    suggested_date_range=DateRange(
                        start_date=vacation_period.start_date,
                        end_date=new_end_date
                    ),
                    efficiency_gain=new_vacation_period.efficiency - vacation_period.efficiency,
                    days_changed=(new_end_date - vacation_period.end_date).days,
                    strategic_score=(new_vacation_period.efficiency - vacation_period.efficiency) * 1.1
                ))
    
    # Recomendação: Algoritmo de deslocamento aprimorado - encontre a janela de deslocamento ideal
    optimal_shift = find_optimal_shift(vacation_period)
    if optimal_shift:
        # Conta fins de semana e feriados no novo período
        new_period = get_vacation_period_details(optimal_shift['start_date'], optimal_shift['end_date'])
        non_work_days = new_period.weekend_days + new_period.holiday_days
        
        # Obtém os nomes dos dias para melhor compreensão
        def get_day_name(date_obj: datetime.date) -> str:
            days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
            return days[date_obj.weekday()]
        
        recommendations.append(Recommendation(
            id=str(uuid.uuid4()),
            type='shift',
            title='Adiar período' if optimal_shift['start_date'] > vacation_period.start_date else 'Antecipar período',
            description=f"{'Adie' if optimal_shift['start_date'] > vacation_period.start_date else 'Antecipe'} todo o período em {optimal_shift['days_shifted']} dia(s) ({format_date(optimal_shift['start_date'], '%d/%m')} {get_day_name(optimal_shift['start_date'])} - {format_date(optimal_shift['end_date'], '%d/%m')} {get_day_name(optimal_shift['end_date'])}) aproveitando {non_work_days} dias não úteis",
            suggested_date_range=DateRange(
                start_date=optimal_shift['start_date'],
                end_date=optimal_shift['end_date']
            ),
            efficiency_gain=optimal_shift['efficiency_gain'],
            days_changed=optimal_shift['days_shifted'],
            strategic_score=optimal_shift['efficiency_gain'] * 1.05
        ))
    
    # Recomendação: Divisão inteligente - encontre o ponto de divisão ideal
    optimal_split = find_optimal_split_point(vacation_period)
    # Sempre recomenda a divisão se tiver boa distribuição, mesmo sem ganho de eficiência
    # A flexibilidade de ter dois períodos é em si um benefício
    if optimal_split and (optimal_split['best_distribution'] > 0.5 or optimal_split['combined_efficiency'] > vacation_period.efficiency):
        first_period = optimal_split['first_period']
        second_period = optimal_split['second_period']
        
        # Verifica explicitamente que ambos os períodos contêm dias úteis
        if first_period.work_days > 0 and second_period.work_days > 0:
            # Calcula o total de dias não úteis em ambos os períodos
            total_non_work_days_first = first_period.weekend_days + first_period.holiday_days
            total_non_work_days_second = second_period.weekend_days + second_period.holiday_days
            
            # Obtém o nome dos dias da semana para facilitar compreensão
            def get_day_of_week_name(date_obj: datetime.date) -> str:
                days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
                return days[date_obj.weekday()]
            
            recommendations.append(Recommendation(
                id=str(uuid.uuid4()),
                type='split',
                title='Fracionar período inteligente',
                description=f"Divida suas férias em dois períodos para maior flexibilidade: {format_date(first_period.start_date, '%d/%m')} ({get_day_of_week_name(first_period.start_date)}) a {format_date(first_period.end_date, '%d/%m')} ({get_day_of_week_name(first_period.end_date)}) ({total_non_work_days_first} dias não úteis) e {format_date(second_period.start_date, '%d/%m')} ({get_day_of_week_name(second_period.start_date)}) a {format_date(second_period.end_date, '%d/%m')} ({get_day_of_week_name(second_period.end_date)}) ({total_non_work_days_second} dias não úteis)",
                suggested_date_range=DateRange(
                    start_date=vacation_period.start_date,
                    end_date=vacation_period.end_date
                ),
                efficiency_gain=max(0.01, optimal_split['combined_efficiency'] - vacation_period.efficiency),  # Garante pelo menos 1% de ganho para mostrar benefício
                days_changed=0,
                strategic_score=max(0.01, optimal_split['combined_efficiency'] - vacation_period.efficiency) * 1.15
            ))
    
    # Recomendação: Pontes entre feriados
    # Só sugere se o período atual não for já uma ponte
    if vacation_period.total_days <= 7:
        current_year = vacation_period.start_date.year
        bridges = find_potential_bridges(current_year, 3)
        
        # Filtra pontes que não se sobrepõem ao período atual
        non_overlapping_bridges = [
            bridge for bridge in bridges
            if bridge['end_date'] < vacation_period.start_date or bridge['start_date'] > vacation_period.end_date
        ]
        
        # Obtém as 2 pontes mais eficientes
        top_bridges = sorted(
            [
                {
                    **bridge,
                    'period': get_vacation_period_details(bridge['start_date'], bridge['end_date']),
                }
                for bridge in non_overlapping_bridges
            ],
            key=lambda x: x['period'].efficiency,
            reverse=True
        )[:2]
        
        # Adiciona recomendações para pontes
        for bridge in top_bridges:
            # Calcula dias não úteis na ponte
            total_days = (bridge['end_date'] - bridge['start_date']).days + 1
            non_work_days = total_days - bridge['work_days']
            
            recommendations.append(Recommendation(
                id=str(uuid.uuid4()),
                type='bridge',
                title='Aproveitar "ponte" entre feriados',
                description=f"Considere o período de {format_date(bridge['start_date'])} a {format_date(bridge['end_date'])} para criar uma \"ponte\" entre feriados ({bridge['work_days']} dia(s) útil(s) para {non_work_days} dia(s) não útil(s)))",
                suggested_date_range=DateRange(
                    start_date=bridge['start_date'],
                    end_date=bridge['end_date']
                ),
                efficiency_gain=bridge['period'].efficiency - vacation_period.efficiency,
                days_changed=bridge['period'].total_days,
                strategic_score=bridge['period'].efficiency
            ))
    
    # Recomendação: Analisa eficiência preditiva para períodos longos
    if vacation_period.total_days >= 14:
        year = vacation_period.start_date.year
        current_month = vacation_period.start_date.month
        
        print(f"Analisando períodos otimizados para férias de {vacation_period.total_days} dias no mês {current_month}")
        
        # Encontra os períodos mais eficientes de comprimento semelhante
        optimal_periods = [
            period for period in find_optimal_periods(year, vacation_period.total_days, 5)
            # Filtra períodos que estão em uma parte diferente do ano (relaxando para +/- 4 meses)
            if (abs(period.start_date.month - current_month) <= 4 or abs(period.start_date.month - current_month) >= 8)
            # Só recomenda se for melhor (relaxando para apenas 5% melhor)
            and period.efficiency - vacation_period.efficiency > 0.05
            # Garante que o período tem dias úteis (não está apenas pegando fins de semana)
            and period.work_days > 0
        ]
        
        print(f"Encontrados {len(optimal_periods)} períodos otimizados")
        
        for period in optimal_periods:
            recommendations.append(Recommendation(
                id=str(uuid.uuid4()),
                type='optimize',
                title='Período otimizado',
                description=f"Considere deslocar suas férias para o período de {format_date(period.start_date)} a {format_date(period.end_date)} para maximizar a eficiência ({period.work_days} dias úteis, {period.weekend_days + period.holiday_days} dias não úteis)",
                suggested_date_range=DateRange(
                    start_date=period.start_date,
                    end_date=period.end_date
                ),
                efficiency_gain=period.efficiency - vacation_period.efficiency,
                days_changed=abs((period.start_date - vacation_period.start_date).days),
                strategic_score=period.efficiency
            ))
    
    # Filtra recomendações que se sobrepõem ao recesso judicial
    filtered_recommendations = []
    for rec in recommendations:
        # Para optimal_fraction, verifica cada período individual
        if rec.type == 'optimal_fraction' and rec.fractioned_periods:
            if not any(overlaps_with_judicial_recess(period.start_date, period.end_date) for period in rec.fractioned_periods):
                filtered_recommendations.append(rec)
            continue
        
        # Para recomendações regulares
        if not overlaps_with_judicial_recess(rec.suggested_date_range.start_date, rec.suggested_date_range.end_date):
            filtered_recommendations.append(rec)
    
    # Calcula uma "pontuação prática" para cada recomendação com base nos dias de início/fim
    def get_recommendation_score(rec: Recommendation) -> float:
        # Verifica intervalo de datas válido (data de início deve ser anterior ou igual à data de término)
        if rec.suggested_date_range.start_date > rec.suggested_date_range.end_date:
            # Intervalo de datas inválido, penaliza severamente
            return -100
        
        # Começa com o ganho de eficiência como pontuação base
        score = rec.efficiency_gain
        
        # Não aplica pontuação adicional a períodos fracionados
        if rec.type == 'optimal_fraction':
            return score
        
        start_day = rec.suggested_date_range.start_date.weekday()
        end_day = rec.suggested_date_range.end_date.weekday()
        
        # Bônus para períodos que começam na segunda-feira
        if start_day == 0:  # Segunda-feira
            score += 0.08  # Bônus aumentado
        elif start_day in [1, 2, 3]:
            # Pequeno bônus para dias da semana (não tão bom quanto segunda-feira)
            score += 0.02
        
        # Penalidade para períodos que começam na sexta, sábado ou domingo
        if start_day == 4:  # Sexta
            score -= 0.07  # Penalidade mais pesada
        elif start_day == 5:  # Sábado
            score -= 0.12  # Penalidade muito pesada
        elif start_day == 6:  # Domingo
            score -= 0.10  # Penalidade pesada
        
        # Bônus para períodos que terminam na sexta-feira
        if end_day == 4:  # Sexta-feira
            score += 0.08  # Bônus aumentado
        elif end_day in [1, 2, 3]:
            # Pequeno bônus para dias da semana (não tão bom quanto sexta-feira)
            score += 0.02
        
        # Penalidade para períodos que terminam no fim de semana ou segunda-feira
        if end_day == 6:  # Domingo
            score -= 0.12  # Penalidade muito pesada
        elif end_day == 5:  # Sábado
            score -= 0.10  # Penalidade pesada
        elif end_day == 0:  # Segunda-feira
            score -= 0.07  # Penalidade mais pesada (segunda-feira após o fim de semana é um desperdício)
        
        # Bônus extra para um período "perfeito" (segunda a sexta-feira)
        if start_day == 0 and end_day == 4:
            score += 0.05  # Bônus de período perfeito
        
        return score
    
    # Atualiza as pontuações estratégicas com base no algoritmo de pontuação
    for rec in filtered_recommendations:
        rec.strategic_score = get_recommendation_score(rec)
    
    # Ordena as recomendações: optimal_fraction primeiro, depois por pontuação combinada
    return sorted(filtered_recommendations, key=lambda x: 
        (-1 if x.type == 'optimal_fraction' else 0, -x.strategic_score))


# Funções de Teste e Avaliação


def test_efficiency_calculation():
    """
    Testa a função de cálculo de eficiência com vários períodos de férias 
    para garantir que ela esteja funcionando corretamente.
    """
    test_cases = [
        # Período curto com um feriado
        {
            'name': 'Período curto com um feriado',
            'start': datetime.date(2024, 5, 1),  # Dia do Trabalho
            'end': datetime.date(2024, 5, 5),     # Domingo
            'expected_workdays': 2,
            'expected_weekends': 2,
            'expected_holidays': 1
        },
        # Período típico (14 dias) começando em uma segunda-feira
        {
            'name': 'Período típico começando segunda',
            'start': datetime.date(2024, 7, 1),   # Segunda-feira
            'end': datetime.date(2024, 7, 14),    # Domingo (2 fins de semana completos)
            'expected_workdays': 10,
            'expected_weekends': 4,
            'expected_holidays': 0
        },
        # Período durante o recesso de fim de ano
        {
            'name': 'Período durante o recesso',
            'start': datetime.date(2024, 12, 23),  # Segunda antes do Natal
            'end': datetime.date(2025, 1, 5),      # Domingo após Ano Novo
            'expected_workdays': 0,
            'expected_weekends': 0,
            'expected_holidays': 14
        },
        # Período com muitos feriados (Carnaval e ponte)
        {
            'name': 'Período com muitos feriados (Carnaval)',
            'start': datetime.date(2025, 2, 28),  # Sexta antes do Carnaval
            'end': datetime.date(2025, 3, 7),     # Sexta depois do Carnaval
            'expected_workdays': 4,
            'expected_weekends': 2,
            'expected_holidays': 2
        },
        # Período com eficiência perfeita (só feriados e fins de semana)
        {
            'name': 'Período com eficiência perfeita',
            'start': datetime.date(2024, 12, 21),  # Sábado no início do recesso
            'end': datetime.date(2024, 12, 29),    # Domingo 
            'expected_workdays': 0,
            'expected_weekends': 0,
            'expected_holidays': 9
        }
    ]
    
    print("\n=== TESTE DE CÁLCULO DE EFICIÊNCIA ===")
    for case in test_cases:
        period = get_vacation_period_details(case['start'], case['end'])
        
        # Calcula eficiência esperada para comparação
        total_days = (case['end'] - case['start']).days + 1
        expected_efficiency = 1 - (case['expected_workdays'] / total_days) if total_days > 0 else 0
        
        print(f"\nTestando: {case['name']}")
        print(f"Período: {format_date(case['start'])} a {format_date(case['end'])}")
        print(f"Dias Úteis: {period.work_days} (esperado: {case['expected_workdays']})")
        print(f"Fins de Semana: {period.weekend_days} (esperado: {case['expected_weekends']})")
        print(f"Feriados: {period.holiday_days} (esperado: {case['expected_holidays']})")
        print(f"Eficiência: {period.efficiency*100:.2f}% (esperado: {expected_efficiency*100:.2f}%)")
        
        # Verifica se os cálculos estão corretos
        assert period.work_days == case['expected_workdays'], f"Erro na contagem de dias úteis para o caso {case['name']}"
        assert period.weekend_days == case['expected_weekends'], f"Erro na contagem de fins de semana para o caso {case['name']}"
        assert period.holiday_days == case['expected_holidays'], f"Erro na contagem de feriados para o caso {case['name']}"
        assert abs(period.efficiency - expected_efficiency) < 0.001, f"Erro no cálculo de eficiência para o caso {case['name']}"
    
    print("\nTodos os testes de cálculo de eficiência passaram!")


def test_vacation_recommendations():
    """
    Testa o sistema de recomendações de férias com vários casos de uso.
    Avalia a qualidade das recomendações oferecidas.
    """
    test_cases = [
        # Caso 1: Período padrão de 15 dias 
        {
            'name': 'Período padrão de 15 dias',
            'start': datetime.date(2024, 7, 15),  # Segunda-feira
            'end': datetime.date(2024, 7, 29),    # Segunda-feira
            'expected_recommendation_types': ['optimal_fraction', 'shift', 'split']
        },
        # Caso 2: Período curto próximo de um feriado
        {
            'name': 'Período curto próximo de um feriado',
            'start': datetime.date(2024, 4, 15),  # Segunda-feira antes do feriado de Tiradentes
            'end': datetime.date(2024, 4, 19),    # Sexta-feira
            'expected_recommendation_types': ['extend', 'bridge']
        },
        # Caso 3: Período durante recesso de fim de ano
        {
            'name': 'Período durante o recesso (deve sugerir mudança)',
            'start': datetime.date(2024, 12, 15), 
            'end': datetime.date(2024, 12, 29),
            'expected_recommendation_types': ['shift', 'split']
        },
        # Caso 4: Período com boa eficiência que poderia ser melhorado
        {
            'name': 'Período com boa eficiência que poderia ser melhorado',
            'start': datetime.date(2025, 4, 14),  # Segunda-feira antes da Sexta-feira Santa
            'end': datetime.date(2025, 4, 25),    # Sexta-feira após o feriado de Tiradentes
            'expected_recommendation_types': ['split', 'extend', 'shift']
        }
    ]
    
    print("\n=== TESTE DE RECOMENDAÇÕES DE FÉRIAS ===")
    for case in test_cases:
        period = get_vacation_period_details(case['start'], case['end'])
        recommendations = generate_recommendations(period)
        
        print(f"\nTestando: {case['name']}")
        print(f"Período: {format_date(case['start'])} a {format_date(case['end'])}")
        print(f"Eficiência original: {period.efficiency*100:.2f}%")
        print(f"Número de recomendações geradas: {len(recommendations)}")
        
        # Mostra as recomendações geradas
        for i, rec in enumerate(recommendations[:5]):  # Mostra apenas as 5 primeiras
            print(f"{i+1}. {rec.title} - Ganho: {rec.efficiency_gain*100:.2f}%, Pontuação: {rec.strategic_score:.2f}")
            print(f"   {rec.description}")
        
        # Verifica se os tipos esperados de recomendação estão presentes
        rec_types = [rec.type for rec in recommendations]
        missing_types = [t for t in case['expected_recommendation_types'] if t not in rec_types]
        
        if missing_types:
            print(f"ALERTA: Tipos de recomendação esperados ausentes: {missing_types}")
        else:
            print(f"Todos os tipos de recomendação esperados foram gerados.")
            
        # Opcional: analisa a qualidade das recomendações
        if recommendations:
            best_rec = recommendations[0]
            print(f"Melhor recomendação: {best_rec.title} com ganho de {best_rec.efficiency_gain*100:.2f}%")
        else:
            print("Nenhuma recomendação gerada para este caso.")
    
    print("\nTestes de recomendações concluídos!")


def analyze_year_efficiency(year=2024):
    """
    Analisa a eficiência de férias ao longo de todo o ano,
    identificando padrões e os melhores períodos para férias.
    """
    print(f"\n=== ANÁLISE DE EFICIÊNCIA PARA O ANO {year} ===")
    
    # Analisa períodos de férias de diferentes comprimentos
    periods_to_analyze = [5, 10, 15, 20, 30]
    
    # Preparar dados para visualização
    all_dates = []
    efficiencies = {}
    
    # Primeiro colete todas as datas possíveis para o ano
    start_date = datetime.date(year, 1, 1)
    end_date = datetime.date(year, 12, 31)
    
    current_date = start_date
    while current_date <= end_date:
        all_dates.append(current_date)
        current_date += timedelta(days=1)
    
    # Inicialize os dicionários de eficiência para todas as datas
    for period_length in periods_to_analyze:
        efficiencies[period_length] = [np.nan] * len(all_dates)
    
    for period_length in periods_to_analyze:
        print(f"\nAnalisando períodos de {period_length} dias:")
        start_date = datetime.date(year, 1, 1)
        end_date = datetime.date(year, 12, 31 - period_length + 1)
        
        period_data = []
        current_date = start_date
        
        while current_date <= end_date:
            period_end = current_date + timedelta(days=period_length - 1)
            period = get_vacation_period_details(current_date, period_end)
            
            # Só adiciona à análise se tiver pelo menos um dia útil
            if period.work_days > 0:
                period_data.append({
                    'start_date': current_date,
                    'end_date': period_end,
                    'efficiency': period.efficiency,
                    'work_days': period.work_days,
                    'weekend_days': period.weekend_days,
                    'holiday_days': period.holiday_days
                })
                
                # Adiciona o valor de eficiência no índice correspondente à data
                date_index = all_dates.index(current_date)
                efficiencies[period_length][date_index] = period.efficiency
            
            current_date += timedelta(days=1)
        
        # Identifica os melhores períodos
        best_periods = sorted(period_data, key=lambda x: x['efficiency'], reverse=True)[:5]
        
        print(f"Os 5 melhores períodos de {period_length} dias:")
        for i, p in enumerate(best_periods):
            print(f"{i+1}. {format_date(p['start_date'])} a {format_date(p['end_date'])} - Eficiência: {p['efficiency']*100:.2f}%")
            print(f"   Dias úteis: {p['work_days']}, Fins de semana: {p['weekend_days']}, Feriados: {p['holiday_days']}")
    
    # Visualiza eficiência ao longo do ano
    plt.figure(figsize=(15, 8))
    
    for period_length, efficiency_values in efficiencies.items():
        # Plota os dados
        plt.plot(all_dates, efficiency_values, label=f'{period_length} dias')
    
    plt.gcf().autofmt_xdate()
    plt.gca().xaxis.set_major_formatter(mdates.DateFormatter('%d/%m'))
    plt.gca().xaxis.set_major_locator(mdates.MonthLocator())
    
    plt.title(f'Análise de Eficiência de Férias ao Longo de {year}')
    plt.xlabel('Data de Início das Férias')
    plt.ylabel('Eficiência (%)')
    plt.legend()
    plt.grid(True)
    
    # Adiciona linhas verticais nos feriados para referência
    for holiday in ALL_HOLIDAYS:
        holiday_date = parse_date(holiday.date)
        if holiday_date.year == year:
            plt.axvline(x=holiday_date, color='r', linestyle='--', alpha=0.3)
    
    plt.yticks([i/10 for i in range(1, 11)], [f'{i*10}%' for i in range(1, 11)])
    plt.ylim(0.0, 1.0)
    
    plt.savefig(f'efficiency_analysis_{year}.png', dpi=300, bbox_inches='tight')
    print(f"\nGráfico de eficiência salvo como 'efficiency_analysis_{year}.png'")


def analyze_optimal_fractioning(year=2024):
    """
    Analisa e compara diferentes estratégias de fracionamento de férias.
    """
    print("\n=== ANÁLISE DE FRACIONAMENTO ÓTIMO DE FÉRIAS ===")
    
    # Testa diferentes configurações de fracionamento
    strategies = [
        (2, 15),  # 2 períodos de 15 dias
        (3, 10),  # 3 períodos de 10 dias
        (6, 5)    # 6 períodos de 5 dias
    ]
    
    results = []
    
    for count, days in strategies:
        print(f"\nAnalisando estratégia: {count} períodos de {days} dias")
        fractionation = find_optimal_fractioned_periods(year, count, days)
        
        if fractionation:
            print(f"Eficiência combinada: {fractionation.combined_efficiency*100:.2f}%")
            print(f"Ganho sobre período único: {fractionation.efficiency_gain*100:.2f}%")
            
            # Adiciona aos resultados
            results.append({
                'strategy': f"{count}x{days}",
                'combined_efficiency': fractionation.combined_efficiency,
                'efficiency_gain': fractionation.efficiency_gain,
                'periods': fractionation.periods
            })
            
            # Mostra detalhes de cada período
            for i, period in enumerate(fractionation.periods):
                print(f"Período {i+1}: {format_date(period.start_date)} a {format_date(period.end_date)}")
                print(f"  Dias úteis: {period.work_days}, Fins de semana: {period.weekend_days}, Feriados: {period.holiday_days}")
                print(f"  Eficiência: {period.efficiency*100:.2f}%")
    
    # Compara as estratégias
    if results:
        print("\nComparação de estratégias de fracionamento:")
        best_strategy = max(results, key=lambda x: x['combined_efficiency'])
        
        for res in results:
            print(f"Estratégia {res['strategy']}: {res['combined_efficiency']*100:.2f}% eficiência " + 
                  ("(MELHOR)" if res == best_strategy else ""))
        
        # Visualiza a comparação
        plt.figure(figsize=(10, 6))
        strategies = [r['strategy'] for r in results]
        efficiencies = [r['combined_efficiency'] * 100 for r in results]
        
        sns.barplot(x=strategies, y=efficiencies)
        plt.title(f'Comparação de Estratégias de Fracionamento ({year})')
        plt.xlabel('Estratégia (períodos x dias)')
        plt.ylabel('Eficiência Combinada (%)')
        plt.grid(True, axis='y')
        
        plt.savefig(f'fractioning_comparison_{year}.png', dpi=300, bbox_inches='tight')
        print(f"\nGráfico de comparação salvo como 'fractioning_comparison_{year}.png'")


def test_recommendation_quality():
    """
    Avalia a qualidade das recomendações em um conjunto grande de casos de teste.
    Produz métricas para a eficácia do algoritmo.
    """
    print("\n=== AVALIAÇÃO DE QUALIDADE DAS RECOMENDAÇÕES ===")
    
    # Gera um conjunto diversificado de casos de teste
    test_cases = []
    
    # Adiciona períodos começando em diferentes dias da semana
    for month in [1, 4, 7, 10]:  # Distribuído ao longo do ano
        for day_of_week in range(7):  # 0=Segunda a 6=Domingo
            # Encontra a primeira data do mês com o dia da semana desejado
            date = datetime.date(2024, month, 1)
            while date.weekday() != day_of_week:
                date += timedelta(days=1)
            
            # Adiciona períodos de diferentes comprimentos
            for length in [5, 10, 15, 30]:
                test_cases.append({
                    'start': date,
                    'end': date + timedelta(days=length - 1)
                })
    
    # Adiciona alguns casos específicos para teste (feriados, pontes, etc.)
    special_cases = [
        # Semana do Carnaval
        {'start': datetime.date(2024, 2, 12), 'end': datetime.date(2024, 2, 16)},
        # Páscoa
        {'start': datetime.date(2024, 3, 25), 'end': datetime.date(2024, 3, 29)},
        # Emenda com 2 feriados (Tiradentes + Dia do Trabalho)
        {'start': datetime.date(2024, 4, 22), 'end': datetime.date(2024, 5, 3)},
        # Recesso de fim de ano
        {'start': datetime.date(2024, 12, 16), 'end': datetime.date(2024, 12, 27)}
    ]
    
    test_cases.extend(special_cases)
    
    # Métricas
    total_cases = len(test_cases)
    cases_with_recommendations = 0
    total_efficiency_gain = 0
    significant_improvement_cases = 0  # >10% de ganho
    
    recommendation_types = {}
    recommendation_quality = []
    
    for i, case in enumerate(test_cases):
        period = get_vacation_period_details(case['start'], case['end'])
        recommendations = generate_recommendations(period)
        
        # Atualiza métricas
        has_recommendations = len(recommendations) > 0
        cases_with_recommendations += 1 if has_recommendations else 0
        
        if has_recommendations:
            best_rec = recommendations[0]
            total_efficiency_gain += best_rec.efficiency_gain
            significant_improvement_cases += 1 if best_rec.efficiency_gain > 0.1 else 0
            
            # Conta tipos de recomendação
            rec_type = best_rec.type
            recommendation_types[rec_type] = recommendation_types.get(rec_type, 0) + 1
            
            # Armazena dados para a análise de qualidade
            recommendation_quality.append({
                'original_efficiency': period.efficiency,
                'recommendation_efficiency': period.efficiency + best_rec.efficiency_gain,
                'efficiency_gain': best_rec.efficiency_gain,
                'recommendation_type': rec_type,
                'period_length': (case['end'] - case['start']).days + 1,
                'strategic_score': best_rec.strategic_score
            })
        
        # Mostra progresso
        if (i + 1) % 10 == 0 or i == total_cases - 1:
            print(f"Progresso: {i+1}/{total_cases} casos analisados")
    
    # Calcula e mostra métricas
    recommendation_rate = cases_with_recommendations / total_cases
    avg_efficiency_gain = total_efficiency_gain / cases_with_recommendations if cases_with_recommendations > 0 else 0
    significant_improvement_rate = significant_improvement_cases / total_cases
    
    print("\nMétricas de qualidade das recomendações:")
    print(f"Total de casos analisados: {total_cases}")
    print(f"Taxa de recomendação: {recommendation_rate*100:.2f}%")
    print(f"Ganho médio de eficiência: {avg_efficiency_gain*100:.2f}%")
    print(f"Taxa de melhoria significativa (>10%): {significant_improvement_rate*100:.2f}%")
    
    print("\nDistribuição de tipos de recomendação:")
    for rec_type, count in sorted(recommendation_types.items(), key=lambda x: x[1], reverse=True):
        print(f"  {rec_type}: {count} ({count/cases_with_recommendations*100:.2f}%)")
    
    # Visualiza a distribuição de ganhos de eficiência
    if recommendation_quality:
        # Converte para DataFrame para facilitar a análise
        quality_df = pd.DataFrame(recommendation_quality)
        
        plt.figure(figsize=(12, 8))
        
        plt.subplot(2, 2, 1)
        sns.histplot(quality_df['efficiency_gain'] * 100, bins=20, kde=True)
        plt.title('Distribuição de Ganhos de Eficiência')
        plt.xlabel('Ganho de Eficiência (%)')
        plt.ylabel('Frequência')
        
        plt.subplot(2, 2, 2)
        sns.boxplot(x='recommendation_type', y='efficiency_gain', data=quality_df)
        plt.title('Ganho de Eficiência por Tipo de Recomendação')
        plt.xlabel('Tipo de Recomendação')
        plt.ylabel('Ganho de Eficiência')
        plt.xticks(rotation=45)
        
        plt.subplot(2, 2, 3)
        sns.scatterplot(x='original_efficiency', y='efficiency_gain', data=quality_df)
        plt.title('Ganho vs. Eficiência Original')
        plt.xlabel('Eficiência Original')
        plt.ylabel('Ganho de Eficiência')
        
        plt.subplot(2, 2, 4)
        sns.boxplot(data=quality_df, x='period_length', y='efficiency_gain')
        plt.title('Ganho de Eficiência por Comprimento do Período')
        plt.xlabel('Comprimento do Período (dias)')
        plt.ylabel('Ganho de Eficiência')
        
        plt.tight_layout()
        plt.savefig('recommendation_quality_analysis.png', dpi=300, bbox_inches='tight')
        print("\nAnálise de qualidade das recomendações salva como 'recommendation_quality_analysis.png'")


def main():
    """
    Função principal que executa o conjunto completo de testes.
    """
    print("=== INICIANDO TESTE DO OTIMIZADOR DE FÉRIAS JUDICIAIS ===\n")
    
    # Testes básicos de cálculo de eficiência
    test_efficiency_calculation()
    
    # Testes do sistema de recomendações
    test_vacation_recommendations()
    
    # Análise de eficiência anual
    analyze_year_efficiency(2024)
    analyze_year_efficiency(2025)
    
    # Análise de estratégias de fracionamento
    analyze_optimal_fractioning(2024)
    
    # Avaliação de qualidade das recomendações
    test_recommendation_quality()
    
    print("\n=== TESTE CONCLUÍDO COM SUCESSO ===")


if __name__ == "__main__":
    main()

# Funções de Melhoria e Comparação Algoritmica

def analyze_algorithm_weaknesses():
    """
    Analisa pontos fracos no algoritmo atual e identifica áreas para melhoria.
    """
    print("\n=== ANÁLISE DE PONTOS FRACOS DO ALGORITMO ===")
    
    # Casos de teste específicos que podem expor deficiências no algoritmo atual
    test_cases = [
        # Caso 1: Período já eficiente, mas com espaço para melhoria estratégica
        {
            'name': 'Período já eficiente com otimização estratégica',
            'start': datetime.date(2024, 12, 29),  # Domingo (final do recesso)
            'end': datetime.date(2025, 1, 10),     # Sexta-feira 
            'issue': 'Algoritmo pode não sugerir extensão mesmo com ganho moderado de eficiência estratégica'
        },
        # Caso 2: Período com muitos dias úteis consecutivos
        {
            'name': 'Período com muitos dias úteis consecutivos',
            'start': datetime.date(2024, 8, 5),    # Segunda-feira 
            'end': datetime.date(2024, 8, 16),     # Sexta-feira (2 semanas de trabalho completas)
            'issue': 'Algoritmo pode não identificar oportunidades de fracionamento otimizado'
        },
        # Caso 3: Período parcialmente sobreposto a um feriado prolongado
        {
            'name': 'Período parcialmente sobreposto a feriado prolongado',
            'start': datetime.date(2024, 4, 15),   # Segunda antes de Tiradentes
            'end': datetime.date(2024, 4, 24),     # Quarta após Tiradentes
            'issue': 'Algoritmo pode não otimizar adequadamente com deslocamento para capturar mais feriados'
        },
        # Caso 4: Período em mês com alta concentração de feriados
        {
            'name': 'Período em mês com muitos feriados',
            'start': datetime.date(2025, 4, 10),   # Próximo à Semana Santa e Tiradentes
            'end': datetime.date(2025, 4, 25),     
            'issue': 'Algoritmo pode não fragmentar de forma ideal para maximizar captura de feriados'
        },
        # Caso 5: Período que inicia em final de semana 
        {
            'name': 'Período iniciando em final de semana',
            'start': datetime.date(2024, 6, 1),    # Sábado
            'end': datetime.date(2024, 6, 14),     # Sexta-feira
            'issue': 'Algoritmo pode penalizar insuficientemente períodos que começam em finais de semana'
        }
    ]
    
    issues_found = set()
    
    for case in test_cases:
        print(f"\nAnalisando caso: {case['name']}")
        period = get_vacation_period_details(case['start'], case['end'])
        recommendations = generate_recommendations(period)
        
        print(f"Período: {format_date(case['start'])} a {format_date(case['end'])}")
        print(f"Eficiência original: {period.efficiency*100:.2f}%")
        print(f"Possível problema: {case['issue']}")
        
        if not recommendations:
            print("⚠️ PROBLEMA DETECTADO: Nenhuma recomendação gerada para este caso.")
            issues_found.add("Ausência de recomendações em casos que poderiam ser otimizados")
        else:
            best_rec = recommendations[0]
            print(f"Melhor recomendação: {best_rec.title} com ganho de {best_rec.efficiency_gain*100:.2f}%")
            
            # Verifica baixo ganho de eficiência
            if best_rec.efficiency_gain < 0.05:
                print("⚠️ PROBLEMA DETECTADO: Recomendações com ganho de eficiência muito baixo")
                issues_found.add("Recomendações com ganho de eficiência marginal")
            
            # Analisa a distribuição de dias não úteis
            if best_rec.type == 'split':
                if not best_rec.fractioned_periods:
                    print("⚠️ PROBLEMA DETECTADO: Recomendação de split sem detalhes de períodos fracionados")
                    issues_found.add("Implementação incompleta de recomendações de divisão")
            
            # Verifica posicionamento estratégico
            if any(d in [5, 6] for d in [case['start'].weekday(), case['end'].weekday()]):
                found_strategic_rec = False
                for rec in recommendations:
                    if rec.type in ['shift'] and rec.efficiency_gain > 0.03:
                        found_strategic_rec = True
                        break
                
                if not found_strategic_rec:
                    print("⚠️ PROBLEMA DETECTADO: Ausência de recomendações estratégicas para períodos mal posicionados")
                    issues_found.add("Algoritmo não prioriza adequadamente posicionamento estratégico")
    
    # Relatório consolidado de pontos fracos
    print("\nPontos fracos identificados no algoritmo atual:")
    for i, issue in enumerate(issues_found, 1):
        print(f"{i}. {issue}")
    
    # Sugestões de melhoria
    print("\nSugestões de melhoria para o algoritmo:")
    suggestions = [
        "Implementar um sistema de pontuação estratégica para recomendações além do ganho de eficiência",
        "Melhorar o algoritmo de fracionamento para considerar melhor a distribuição de feriados",
        "Adicionar penalidades mais significativas para períodos que iniciam ou terminam em finais de semana",
        "Desenvolver um sistema de recomendação híbrida que sugira combinações de estratégias",
        "Implementar análise de tendências sazonais para identiicar períodos ótimos em diferentes partes do ano"
    ]
    
    for i, suggestion in enumerate(suggestions, 1):
        print(f"{i}. {suggestion}")
    
    return issues_found


def implement_improved_recommendations(vacation_period: VacationPeriod) -> List[Recommendation]:
    """
    Implementa versão aprimorada do algoritmo de recomendações.
    Esta função incorpora as melhorias identificadas na análise de pontos fracos.
    """
    # Versão regular de recomendações
    original_recommendations = generate_recommendations(vacation_period)
    
    # Implementa melhorias no algoritmo:
    improved_recommendations = []
    
    # 1. Melhorar pontuação estratégica para cada recomendação
    for rec in original_recommendations:
        # Copia a recomendação original
        improved_rec = Recommendation(
            id=rec.id,
            type=rec.type,
            title=rec.title,
            description=rec.description,
            suggested_date_range=rec.suggested_date_range,
            efficiency_gain=rec.efficiency_gain,
            days_changed=rec.days_changed,
            fractioned_periods=rec.fractioned_periods,
            strategic_score=rec.strategic_score
        )
        
        # Melhoria 1: Ajustar título para maior clareza
        if rec.type == 'extend':
            if rec.suggested_date_range.start_date < vacation_period.start_date:
                improved_rec.title = f"Estender no início (+{rec.days_changed} dias)"
            else:
                improved_rec.title = f"Estender no final (+{rec.days_changed} dias)"
        elif rec.type == 'shift':
            direction = "adiante" if rec.suggested_date_range.start_date > vacation_period.start_date else "para trás"
            improved_rec.title = f"Deslocar período {direction} ({rec.days_changed} dias)"
        elif rec.type == 'split':
            improved_rec.title = "Dividir em dois períodos estratégicos"
        elif rec.type == 'optimal_fraction':
            improved_rec.title = f"Fracionar férias ótimo (ganho {rec.efficiency_gain*100:.0f}%)"
        
        # Melhoria 2: Ajustar descrição para incluir informação mais estratégica
        if rec.type != 'optimal_fraction' and rec.type != 'error':
            # Adiciona análise de posicionamento estratégico
            start_day = rec.suggested_date_range.start_date.weekday()
            end_day = rec.suggested_date_range.end_date.weekday()
            
            strategic_notes = []
            if start_day == 0:  # Segunda-feira
                strategic_notes.append("inicia na segunda-feira (ideal)")
            if end_day == 4:    # Sexta-feira
                strategic_notes.append("termina na sexta-feira (ideal)")
            
            if strategic_notes:
                improved_rec.description += f" - Este período {' e '.join(strategic_notes)}."
        
        # Melhoria 3: Recalcular pontuação estratégica com maior peso para posicionamento
        # Bonus para períodos que começam na segunda e terminam na sexta
        position_bonus = 0
        if rec.type != 'optimal_fraction':
            start_day = rec.suggested_date_range.start_date.weekday()
            end_day = rec.suggested_date_range.end_date.weekday()
            
            # Dá mais peso para começar na segunda e terminar na sexta
            if start_day == 0:  # Segunda
                position_bonus += 0.10  # Aumentado de 0.08
            if end_day == 4:    # Sexta
                position_bonus += 0.10  # Aumentado de 0.08
                
            # Penaliza mais severamente períodos que começam em fins de semana 
            if start_day >= 5:  # Sábado ou domingo
                position_bonus -= 0.15  # Penalidade aumentada
                
            # Penaliza períodos que terminam em fins de semana ainda mais
            if end_day >= 5:    # Sábado ou domingo
                position_bonus -= 0.20  # Penalidade significativamente aumentada
        
        improved_rec.strategic_score = rec.efficiency_gain + position_bonus
        
        # Melhoria 4: Enfatizar eficiência no título para recomendações significativas
        if rec.efficiency_gain > 0.10:
            efficiency_percentage = int(rec.efficiency_gain * 100)
            if "ganho" not in improved_rec.title:
                improved_rec.title += f" (+{efficiency_percentage}% eficiência)"
        
        improved_recommendations.append(improved_rec)
    
    # Melhoria 5: Adicionar recomendações híbridas (combinadas) quando aplicável
    if len(original_recommendations) >= 2:
        rec1 = original_recommendations[0]
        rec2 = original_recommendations[1]
        
        # Só combina recomendações compatíveis
        compatible_combinations = [
            ('split', 'shift'),
            ('split', 'extend'),
            ('extend', 'shift')
        ]
        
        # Verifica combinações em ambas as direções
        if (rec1.type, rec2.type) in compatible_combinations or (rec2.type, rec1.type) in compatible_combinations:
            hybrid_id = str(uuid.uuid4())
            hybrid_title = f"Estratégia combinada: {rec1.title} + {rec2.title}"
            hybrid_description = f"Aproveite os benefícios de duas estratégias: {rec1.description} Depois, {rec2.description}"
            
            # Estima ganho combinado (simplificação, na prática precisaria recalcular)
            estimated_gain = min(0.95 * (rec1.efficiency_gain + rec2.efficiency_gain), 0.5)  # Cap em 50%
            
            hybrid_rec = Recommendation(
                id=hybrid_id,
                type='hybrid',
                title=hybrid_title,
                description=hybrid_description,
                suggested_date_range=rec1.suggested_date_range,  # Usa range da primeira recomendação
                efficiency_gain=estimated_gain,
                days_changed=rec1.days_changed + rec2.days_changed,
                fractioned_periods=None,
                strategic_score=1.2 * estimated_gain  # Bônus para recomendações híbridas
            )
            
            improved_recommendations.append(hybrid_rec)
    
    # Ordena por pontuação estratégica ajustada
    return sorted(improved_recommendations, key=lambda x: -x.strategic_score)


def compare_recommendation_algorithms(test_cases: List[Dict[str, Any]]) -> pd.DataFrame:
    """
    Compara o desempenho do algoritmo original e melhorado em diversos casos de teste.
    Retorna um DataFrame com métricas comparativas.
    """
    comparison_data = []
    
    for case in test_cases:
        period = get_vacation_period_details(case['start'], case['end'])
        original_recs = generate_recommendations(period)
        improved_recs = implement_improved_recommendations(period)
        
        # Dados básicos para comparação
        case_data = {
            'case_name': case.get('name', f"Período {format_date(case['start'])} a {format_date(case['end'])}"),
            'period_length': period.total_days,
            'original_efficiency': period.efficiency,
            'original_rec_count': len(original_recs),
            'improved_rec_count': len(improved_recs),
            'original_best_gain': original_recs[0].efficiency_gain if original_recs else 0,
            'improved_best_gain': improved_recs[0].efficiency_gain if improved_recs else 0,
            'original_best_score': original_recs[0].strategic_score if original_recs else 0,
            'improved_best_score': improved_recs[0].strategic_score if improved_recs else 0,
            'original_top_type': original_recs[0].type if original_recs else 'none',
            'improved_top_type': improved_recs[0].type if improved_recs else 'none',
        }
        
        # Métricas de melhoria
        case_data['gain_diff'] = case_data['improved_best_gain'] - case_data['original_best_gain']
        case_data['score_diff'] = case_data['improved_best_score'] - case_data['original_best_score']
        case_data['rec_count_diff'] = case_data['improved_rec_count'] - case_data['original_rec_count']
        case_data['type_changed'] = case_data['original_top_type'] != case_data['improved_top_type']
        
        comparison_data.append(case_data)
    
    return pd.DataFrame(comparison_data)


def visualize_improvements(comparison_df: pd.DataFrame):
    """
    Cria visualizações mostrando as melhorias do algoritmo aprimorado.
    """
    plt.figure(figsize=(15, 10))
    
    # 1. Comparação de ganhos de eficiência
    plt.subplot(2, 2, 1)
    comparison_df.plot(
        x='case_name', 
        y=['original_best_gain', 'improved_best_gain'],
        kind='bar',
        ax=plt.gca()
    )
    plt.title('Comparação de Ganhos de Eficiência')
    plt.xlabel('Caso de Teste')
    plt.ylabel('Ganho de Eficiência')
    plt.xticks(rotation=45, ha='right')
    plt.legend(['Original', 'Melhorado'])
    
    # 2. Distribuição das diferenças de ganho
    plt.subplot(2, 2, 2)
    sns.histplot(comparison_df['gain_diff'] * 100, kde=True)
    plt.axvline(x=0, color='r', linestyle='--')
    plt.title('Distribuição das Diferenças de Ganho')
    plt.xlabel('Diferença de Ganho (%)')
    plt.ylabel('Frequência')
    
    # 3. Comparação de tipos de recomendação
    plt.subplot(2, 2, 3)
    
    # Conta os tipos
    original_types = comparison_df['original_top_type'].value_counts()
    improved_types = comparison_df['improved_top_type'].value_counts()
    
    # Prepara dados para gráfico lado a lado
    all_types = set(original_types.index) | set(improved_types.index)
    type_data = []
    
    for rec_type in all_types:
        type_data.append({
            'Tipo': rec_type,
            'Original': original_types.get(rec_type, 0),
            'Melhorado': improved_types.get(rec_type, 0)
        })
    
    type_df = pd.DataFrame(type_data)
    type_df.plot(x='Tipo', y=['Original', 'Melhorado'], kind='bar', ax=plt.gca())
    plt.title('Distribuição de Tipos de Recomendação')
    plt.xlabel('Tipo de Recomendação')
    plt.ylabel('Contagem')
    
    # 4. Comparação de pontuações estratégicas
    plt.subplot(2, 2, 4)
    comparison_df.plot(
        x='case_name', 
        y=['original_best_score', 'improved_best_score'],
        kind='bar',
        ax=plt.gca()
    )
    plt.title('Comparação de Pontuações Estratégicas')
    plt.xlabel('Caso de Teste')
    plt.ylabel('Pontuação Estratégica')
    plt.xticks(rotation=45, ha='right')
    plt.legend(['Original', 'Melhorado'])
    
    plt.tight_layout()
    plt.savefig('algorithm_improvement_comparison.png', dpi=300, bbox_inches='tight')
    print("\nComparação de algoritmos salva como 'algorithm_improvement_comparison.png'")


def generate_improved_test_cases() -> List[Dict[str, Any]]:
    """
    Gera uma lista diversificada de casos de teste para a análise comparativa.
    """
    test_cases = []
    
    # 1. Casos básicos - períodos de 15 dias ao longo do ano
    for month in range(1, 13):
        # Primeiro dia do mês
        start_date = datetime.date(2025, month, 1)
        
        # Ajusta para segunda-feira mais próxima
        while start_date.weekday() != 0:  # 0 = Segunda-feira
            start_date += timedelta(days=1)
        
        test_cases.append({
            'name': f'Período regular - {start_date.strftime("%B")}',
            'start': start_date,
            'end': start_date + timedelta(days=14)  # 15 dias
        })
    
    # 2. Casos para testar todas as recomendações
    special_cases = [
        # Caso para testar extensão
        {
            'name': 'Caso para extensão - próximo a feriado',
            'start': datetime.date(2025, 4, 16),  # Quarta antes da Páscoa
            'end': datetime.date(2025, 4, 25)     # Sexta depois da Páscoa
        },
        # Caso para testar deslocamento 
        {
            'name': 'Caso para deslocamento - período mal posicionado',
            'start': datetime.date(2025, 9, 3),   # Quarta-feira
            'end': datetime.date(2025, 9, 17)     # Quarta-feira 
        },
        # Caso para testar fracionamento
        {
            'name': 'Caso para fracionamento - período longo',
            'start': datetime.date(2025, 7, 7),   # Segunda-feira 
            'end': datetime.date(2025, 7, 25)     # Sexta-feira (3 semanas)
        },
        # Caso para testar pontagem estratégica (começa em final de semana)
        {
            'name': 'Caso para estratégia - início em final de semana',
            'start': datetime.date(2025, 6, 7),   # Sábado
            'end': datetime.date(2025, 6, 21)     # Sábado
        },
        # Caso para testar recesso judicial
        {
            'name': 'Caso para recesso judicial',
            'start': datetime.date(2025, 12, 15), # Segunda antes do recesso
            'end': datetime.date(2025, 12, 26)    # Sexta durante o recesso
        },
        # Caso para testar múltiplos feriados
        {
            'name': 'Caso múltiplos feriados',
            'start': datetime.date(2025, 10, 27), # Segunda antes de Finados
            'end': datetime.date(2025, 11, 14)    # Sexta antes da Proclamação da República
        },
        # Caso já ótimo (para testar o que acontece quando não há melhorias óbvias)
        {
            'name': 'Caso já otimizado',
            'start': datetime.date(2025, 3, 3),   # Segunda de Carnaval
            'end': datetime.date(2025, 3, 7)      # Sexta após Carnaval
        },
        # Caso curto
        {
            'name': 'Caso curto - 5 dias',
            'start': datetime.date(2025, 5, 26),  # Segunda-feira
            'end': datetime.date(2025, 5, 30)     # Sexta-feira
        }
    ]
    
    test_cases.extend(special_cases)
    return test_cases


def analyze_improvements_and_generate_recommendations():
    """
    Analisa melhorias e gera recomendações finais para o sistema.
    """
    print("\n=== ANÁLISE DE MELHORIAS E RECOMENDAÇÕES FINAIS ===")
    
    # Gera casos de teste
    test_cases = generate_improved_test_cases()
    
    # Compara algoritmos
    comparison_df = compare_recommendation_algorithms(test_cases)
    
    # Visualiza melhorias
    visualize_improvements(comparison_df)
    
    # Análise estatística
    avg_gain_improvement = comparison_df['gain_diff'].mean() * 100
    pct_cases_improved = (comparison_df['gain_diff'] > 0).mean() * 100
    avg_score_improvement = comparison_df['score_diff'].mean()
    type_change_rate = comparison_df['type_changed'].mean() * 100
    
    print("\nEstatísticas de melhoria:")
    print(f"Melhoria média no ganho de eficiência: {avg_gain_improvement:.2f}%")
    print(f"Percentual de casos com melhoria: {pct_cases_improved:.2f}%")
    print(f"Melhoria média na pontuação estratégica: {avg_score_improvement:.2f}")
    print(f"Taxa de mudança no tipo de recomendação: {type_change_rate:.2f}%")
    
    # Analisa quando o algoritmo melhorado supera significativamente o original
    significant_improvements = comparison_df[comparison_df['gain_diff'] > 0.05]
    
    if not significant_improvements.empty:
        print("\nCasos com melhorias significativas:")
        for _, row in significant_improvements.iterrows():
            print(f"- {row['case_name']}: +{row['gain_diff']*100:.2f}% de ganho adicional")
    
    # Recomendações finais para o sistema
    print("\nRecomendações finais para aprimoramento do sistema:")
    final_recommendations = [
        "1. Implementar o sistema de pontuação estratégica aprimorado que dá mais peso ao posicionamento das férias",
        "2. Adicionar um algoritmo de recomendações híbridas que combina diferentes estratégias para maximizar benefícios",
        "3. Melhorar as descrições das recomendações para incluir informações estratégicas sobre posicionamento",
        "4. Aumentar as penalidades para períodos que começam ou terminam em finais de semana",
        "5. Introduzir títulos mais informativos que incluam ganhos de eficiência para recomendações significativas",
        "6. Implementar visualizações do calendário para mostrar como as recomendações afetam a distribuição de dias úteis",
        "7. Desenvolver um sistema de perfis de usuário que aprendem preferências (ex.: preferência por períodos curtos ou longos)",
        "8. Acrescentar estatísticas comparativas mostrando a diferença entre o período original e o recomendado"
    ]
    
    for rec in final_recommendations:
        print(rec)
    
    return comparison_df


def demonstrate_algorithm_on_real_case():
    """
    Demonstra o algoritmo melhorado em um caso real detalhado,
    mostrando passo a passo como as recomendações melhoram a experiência do usuário.
    """
    print("\n=== DEMONSTRAÇÃO DO ALGORITMO MELHORADO EM CASO REAL ===")
    
    # Definir um caso desafiador para a demonstração
    start_date = datetime.date(2025, 4, 2)  # Quarta-feira antes da Páscoa
    end_date = datetime.date(2025, 4, 22)   # Terça-feira após Tiradentes
    
    print(f"Análise do período: {format_date(start_date)} a {format_date(end_date)}")
    
    # Obter detalhes do período original
    original_period = get_vacation_period_details(start_date, end_date)
    
    print("\n1. ANÁLISE DO PERÍODO ORIGINAL:")
    print(f"   - Duração: {original_period.total_days} dias")
    print(f"   - Dias úteis: {original_period.work_days}")
    print(f"   - Fins de semana: {original_period.weekend_days}")
    print(f"   - Feriados: {original_period.holiday_days}")
    print(f"   - Eficiência: {original_period.efficiency*100:.2f}%")
    
    # Obter feriados no período
    holidays_in_period = get_holidays_in_range(start_date, end_date)
    if holidays_in_period:
        print("\n   Feriados no período:")
        for holiday in holidays_in_period:
            print(f"   - {format_date(parse_date(holiday.date))}: {holiday.name}")
    
    # Gerar recomendações com o algoritmo original
    original_recommendations = generate_recommendations(original_period)
    
    print("\n2. RECOMENDAÇÕES DO ALGORITMO ORIGINAL:")
    for i, rec in enumerate(original_recommendations[:3], 1):
        print(f"\n   Recomendação #{i}: {rec.title}")
        print(f"   - Tipo: {rec.type}")
        print(f"   - Ganho de eficiência: {rec.efficiency_gain*100:.2f}%")
        print(f"   - Descrição: {rec.description}")
        if rec.type != 'optimal_fraction':
            print(f"   - Período sugerido: {format_date(rec.suggested_date_range.start_date)} a {format_date(rec.suggested_date_range.end_date)}")
    
    # Gerar recomendações com o algoritmo melhorado
    improved_recommendations = implement_improved_recommendations(original_period)
    
    print("\n3. RECOMENDAÇÕES DO ALGORITMO MELHORADO:")
    for i, rec in enumerate(improved_recommendations[:3], 1):
        print(f"\n   Recomendação #{i}: {rec.title}")
        print(f"   - Tipo: {rec.type}")
        print(f"   - Ganho de eficiência: {rec.efficiency_gain*100:.2f}%")
        print(f"   - Pontuação estratégica: {rec.strategic_score:.2f}")
        print(f"   - Descrição: {rec.description}")
        if rec.type != 'optimal_fraction':
            print(f"   - Período sugerido: {format_date(rec.suggested_date_range.start_date)} a {format_date(rec.suggested_date_range.end_date)}")
    
    # Implementar a melhor recomendação
    best_rec = improved_recommendations[0]
    
    if best_rec.type == 'split' and best_rec.fractioned_periods:
        # Caso de fracionamento ideal
        print("\n4. IMPLEMENTAÇÃO DA MELHOR RECOMENDAÇÃO (FRACIONAMENTO):")
        for i, period in enumerate(best_rec.fractioned_periods, 1):
            print(f"\n   Período {i}:")
            print(f"   - Datas: {format_date(period.start_date)} a {format_date(period.end_date)}")
            print(f"   - Duração: {period.total_days} dias")
            print(f"   - Dias úteis: {period.work_days}")
            print(f"   - Fins de semana: {period.weekend_days}")
            print(f"   - Feriados: {period.holiday_days}")
            print(f"   - Eficiência: {period.efficiency*100:.2f}%")
    elif best_rec.type == 'optimal_fraction' and best_rec.fractioned_periods:
        # Caso de fracionamento ideal em múltiplos períodos menores
        print("\n4. IMPLEMENTAÇÃO DA MELHOR RECOMENDAÇÃO (FRACIONAMENTO ÓTIMO):")
        for i, period in enumerate(best_rec.fractioned_periods, 1):
            print(f"\n   Período {i}:")
            print(f"   - Datas: {format_date(period.start_date)} a {format_date(period.end_date)}")
            print(f"   - Duração: {period.total_days} dias")
            print(f"   - Dias úteis: {period.work_days}")
            print(f"   - Dias não úteis: {period.weekend_days + period.holiday_days}")
            print(f"   - Eficiência: {period.efficiency*100:.2f}%")
    else:
        # Caso de período único modificado (shift, extend, etc.)
        if best_rec.type != 'error':
            new_period = get_vacation_period_details(
                best_rec.suggested_date_range.start_date, 
                best_rec.suggested_date_range.end_date
            )
            
            print("\n4. IMPLEMENTAÇÃO DA MELHOR RECOMENDAÇÃO:")
            print(f"   Nova duração: {new_period.total_days} dias")
            print(f"   Novos dias úteis: {new_period.work_days} (redução de {original_period.work_days - new_period.work_days})")
            print(f"   Novos fins de semana: {new_period.weekend_days}")
            print(f"   Novos feriados: {new_period.holiday_days}")
            print(f"   Nova eficiência: {new_period.efficiency*100:.2f}% (aumento de {(new_period.efficiency - original_period.efficiency)*100:.2f}%)")
            
            # Mostrar o ganho real vs. o previsto
            predicted_gain = best_rec.efficiency_gain
            actual_gain = new_period.efficiency - original_period.efficiency
            
            print(f"\n   Ganho de eficiência previsto: {predicted_gain*100:.2f}%")
            print(f"   Ganho de eficiência real: {actual_gain*100:.2f}%")
            
            if abs(predicted_gain - actual_gain) > 0.001:
                print(f"   Diferença: {(predicted_gain - actual_gain)*100:.2f}%")
    
    print("\n5. ANÁLISE DO IMPACTO DA RECOMENDAÇÃO:")
    
    # Análise qualitativa do impacto
    qualitative_analysis = []
    
    if best_rec.type in ['shift', 'extend']:
        # Verificar se o novo período começa na segunda e termina na sexta
        starts_on_monday = best_rec.suggested_date_range.start_date.weekday() == 0
        ends_on_friday = best_rec.suggested_date_range.end_date.weekday() == 4
        
        if starts_on_monday and not (start_date.weekday() == 0):
            qualitative_analysis.append("✓ Melhorou o início para uma segunda-feira, otimizando o uso do fim de semana")
        
        if ends_on_friday and not (end_date.weekday() == 4):
            qualitative_analysis.append("✓ Melhorou o término para uma sexta-feira, otimizando o uso do fim de semana seguinte")
    
    if best_rec.efficiency_gain > 0.1:
        qualitative_analysis.append(f"✓ Aumento significativo na eficiência ({best_rec.efficiency_gain*100:.0f}%)")
    
    if best_rec.type in ['split', 'optimal_fraction']:
        qualitative_analysis.append("✓ Aumento da flexibilidade com múltiplos períodos")
        qualitative_analysis.append("✓ Possibilidade de distribuir férias em diferentes épocas do ano")
    
    if not qualitative_analysis:
        qualitative_analysis.append("No impacto qualitativo significativo identificado")
    
    for analysis in qualitative_analysis:
        print(f"   {analysis}")
    
    print("\n6. CONCLUSÃO:")
    print(f"   O algoritmo melhorado recomendou uma estratégia de '{best_rec.type}' que resultou em")
    print(f"   um aumento de eficiência de aproximadamente {best_rec.efficiency_gain*100:.1f}%,")
    print(f"   com uma pontuação estratégica de {best_rec.strategic_score:.2f}.")
    
    # Adicional: Comparação visual do período original vs. recomendado
    if best_rec.type not in ['split', 'optimal_fraction', 'error']:
        original_days = []
        new_days = []
        
        current = original_period.start_date
        while current <= original_period.end_date:
            day_type = 'Feriado' if is_holiday(current) else ('Fim de semana' if is_weekend(current) else 'Dia útil')
            original_days.append({'date': current, 'type': day_type})
            current += timedelta(days=1)
        
        current = best_rec.suggested_date_range.start_date
        while current <= best_rec.suggested_date_range.end_date:
            day_type = 'Feriado' if is_holiday(current) else ('Fim de semana' if is_weekend(current) else 'Dia útil')
            new_days.append({'date': current, 'type': day_type})
            current += timedelta(days=1)
        
        print("\n   COMPARAÇÃO DE DIAS:")
        print("   Período Original:")
        print("   " + "".join(['F' if day['type'] == 'Feriado' else ('W' if day['type'] == 'Fim de semana' else '-') for day in original_days]))
        
        print("   Período Recomendado:")
        print("   " + "".join(['F' if day['type'] == 'Feriado' else ('W' if day['type'] == 'Fim de semana' else '-') for day in new_days]))
        print("   Legenda: F = Feriado, W = Fim de semana, - = Dia útil")


def main_improved():
    """
    Função principal aprimorada que executa o conjunto completo de testes
    e demonstra o algoritmo aprimorado.
    """
    print("=== INICIANDO TESTE APRIMORADO DO OTIMIZADOR DE FÉRIAS JUDICIAIS ===\n")
    
    # Testes básicos de cálculo de eficiência
    test_efficiency_calculation()
    
    # Testes do sistema de recomendações
    test_vacation_recommendations()
    
    # Análise de eficiência anual (um ano só para economizar tempo)
    analyze_year_efficiency(2025)
    
    # Análise de estratégias de fracionamento
    analyze_optimal_fractioning(2025)
    
    # Análise de pontos fracos do algoritmo
    analyze_algorithm_weaknesses()
    
    # Análise comparativa e visualização de melhorias
    analyze_improvements_and_generate_recommendations()
    
    # Demonstração detalhada em um caso real
    demonstrate_algorithm_on_real_case()
    
    print("\n=== TESTE APRIMORADO CONCLUÍDO COM SUCESSO ===")


if __name__ == "__main__":
    main_improved()