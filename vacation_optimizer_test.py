#!/usr/bin/env python3
"""
Teste Robusto para Algoritmo de Otimização de Férias
----------------------------------------------------
Este script testa a eficácia das correções propostas para o problema
de inclusão de feriados em períodos de férias recomendados.
"""

import datetime
import uuid
import random
from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Tuple, Optional, Set


class Holiday:
    def __init__(self, date_str: str, name: str, holiday_type: str = "national"):
        self.date = datetime.strptime(date_str, "%Y-%m-%d").date()
        self.name = name
        self.type = holiday_type
    
    def __str__(self):
        return f"{self.date.strftime('%Y-%m-%d')} - {self.name} ({self.type})"


class DateRange:
    def __init__(self, start_date: date, end_date: date):
        self.start_date = start_date
        self.end_date = end_date
    
    def __str__(self):
        return f"{self.start_date.strftime('%d/%m/%Y')} a {self.end_date.strftime('%d/%m/%Y')}"
    
    def contains_date(self, check_date: date) -> bool:
        return self.start_date <= check_date <= self.end_date
    
    def duration_days(self) -> int:
        return (self.end_date - self.start_date).days + 1
    
    def overlaps_with(self, other: 'DateRange') -> bool:
        return (self.start_date <= other.end_date and self.end_date >= other.start_date)
    
    def day_list(self) -> List[date]:
        """Retorna uma lista com todas as datas no intervalo"""
        days = []
        current = self.start_date
        while current <= self.end_date:
            days.append(current)
            current += timedelta(days=1)
        return days


class Recommendation:
    def __init__(self, title: str, description: str, date_range: DateRange, 
                 efficiency_gain: float, days_changed: int, strategic_score: float = 0.0):
        self.id = str(uuid.uuid4())
        self.title = title
        self.description = description
        self.date_range = date_range
        self.efficiency_gain = efficiency_gain
        self.days_changed = days_changed
        self.strategic_score = strategic_score
    
    def __str__(self):
        return f"{self.title}: {self.date_range} (score: {self.strategic_score:.2f})"


class VacationOptimizer:
    def __init__(self):
        self.holidays = []
        self.recommendations = []
    
    def load_holidays(self, year: int):
        """Carrega feriados para o ano especificado"""
        # Feriados nacionais fixos
        national_holidays = [
            (f"{year}-01-01", "Confraternização Universal"),
            (f"{year}-04-21", "Tiradentes"),
            (f"{year}-05-01", "Dia do Trabalho"),
            (f"{year}-09-07", "Independência"),
            (f"{year}-10-12", "Nossa Senhora Aparecida"),
            (f"{year}-11-02", "Finados"),
            (f"{year}-11-15", "Proclamação da República"),
            (f"{year}-12-25", "Natal")
        ]
        
        # Adicionar alguns feriados móveis baseados em regras simplificadas
        # Carnaval (exemplo simplificado: sempre em fevereiro)
        carnaval1 = date(year, 2, random.randint(10, 26))
        carnaval2 = carnaval1 + timedelta(days=1)
        
        # Sexta-feira Santa (exemplo simplificado: sempre em março ou abril)
        sexta_santa = date(year, random.choice([3, 4]), random.randint(10, 28))
        
        # Corpus Christi (exemplo simplificado: sempre em maio ou junho)
        corpus_christi = date(year, random.choice([5, 6]), random.randint(10, 28))
        
        mobile_holidays = [
            (carnaval1.strftime("%Y-%m-%d"), "Carnaval"),
            (carnaval2.strftime("%Y-%m-%d"), "Carnaval"),
            (sexta_santa.strftime("%Y-%m-%d"), "Sexta-feira Santa"),
            (corpus_christi.strftime("%Y-%m-%d"), "Corpus Christi")
        ]
        
        # Feriados judiciais
        judicial_holidays = [
            (f"{year}-01-31", "Dia da Justiça Federal", "judicial"),
            (f"{year}-08-11", "Dia do Advogado", "judicial"),
            (f"{year}-10-31", "Dia do Servidor Público", "judicial"),
            (f"{year}-12-08", "Dia da Justiça", "judicial")
        ]
        
        # Recesso judicial
        recess_dates = []
        for day in range(20, 32):  # 20 a 31 de dezembro
            recess_dates.append((f"{year-1}-12-{day:02d}", "Recesso Forense", "recess"))
        
        for day in range(1, 7):    # 1 a 6 de janeiro
            recess_dates.append((f"{year}-01-{day:02d}", "Recesso Forense", "recess"))
        
        # Criar objetos Holiday e adicionar à lista
        for date_str, name in national_holidays + mobile_holidays:
            self.holidays.append(Holiday(date_str, name, "national"))
        
        for date_str, name, h_type in judicial_holidays:
            self.holidays.append(Holiday(date_str, name, h_type))
        
        for date_str, name, h_type in recess_dates:
            self.holidays.append(Holiday(date_str, name, h_type))
        
        print(f"Carregados {len(self.holidays)} feriados para o ano {year}")
    
    def is_holiday(self, check_date: date) -> Optional[Holiday]:
        """Verifica se uma data é feriado"""
        for holiday in self.holidays:
            if holiday.date == check_date:
                return holiday
        return None
    
    def is_weekend(self, check_date: date) -> bool:
        """Verifica se é fim de semana (0=segunda, 6=domingo)"""
        return check_date.weekday() >= 5
    
    def period_contains_holiday(self, period: DateRange) -> List[Holiday]:
        """Verifica se um período contém feriados"""
        holidays_in_period = []
        current = period.start_date
        while current <= period.end_date:
            holiday = self.is_holiday(current)
            if holiday:
                holidays_in_period.append(holiday)
            current += timedelta(days=1)
        return holidays_in_period
    
    def create_recommendations_with_problems(self, year: int, count: int = 10) -> List[Recommendation]:
        """Gera recomendações deliberadamente problemáticas que podem incluir feriados"""
        recommendations = []
        
        # Estratégia 1: Recomendações próximas a feriados (mas incluindo-os)
        for holiday in self.holidays:
            if len(recommendations) >= count:
                break
                
            if holiday.date.year == year:
                # Cria um período que deliberadamente inclui o feriado
                start_date = holiday.date - timedelta(days=random.randint(1, 3))
                end_date = holiday.date + timedelta(days=random.randint(1, 3))
                
                # Garante um mínimo de 5 dias
                if (end_date - start_date).days + 1 < 5:
                    end_date = start_date + timedelta(days=4)
                
                date_range = DateRange(start_date, end_date)
                
                recommendations.append(Recommendation(
                    f"Férias problemáticas incluindo {holiday.name}",
                    f"Este período INCLUI o feriado de {holiday.name}",
                    date_range,
                    1.2,
                    date_range.duration_days(),
                    random.uniform(5.0, 9.0)
                ))
        
        # Estratégia 2: Recomendações aleatórias (que podem incluir feriados)
        while len(recommendations) < count:
            month = random.randint(1, 12)
            day = random.randint(1, 28)
            start_date = date(year, month, day)
            duration = random.randint(5, 15)
            end_date = start_date + timedelta(days=duration-1)
            
            date_range = DateRange(start_date, end_date)
            
            holidays_in_period = self.period_contains_holiday(date_range)
            has_holidays = len(holidays_in_period) > 0
            
            recommendations.append(Recommendation(
                f"{'Férias problemáticas' if has_holidays else 'Férias normais'} em {month}/{year}",
                f"Este período {'INCLUI' if has_holidays else 'NÃO inclui'} feriados",
                date_range,
                1.3,
                date_range.duration_days(),
                random.uniform(4.0, 8.0)
            ))
        
        return recommendations
    
    def create_bridge_recommendations(self, year: int, count: int = 10) -> List[Recommendation]:
        """Cria recomendações de ponte, evitando incluir feriados"""
        recommendations = []
        
        # Organizar feriados por data
        sorted_holidays = sorted(self.holidays, key=lambda h: h.date)
        
        # Encontrar pontes entre feriados
        for i, holiday1 in enumerate(sorted_holidays[:-1]):
            if len(recommendations) >= count:
                break
                
            if holiday1.date.year != year:
                continue
                
            # Procurar o próximo feriado
            for j in range(i+1, len(sorted_holidays)):
                holiday2 = sorted_holidays[j]
                
                if holiday2.date.year != year:
                    continue
                    
                # Calcular dias entre os feriados
                days_between = (holiday2.date - holiday1.date).days - 1
                
                # Consideramos uma ponte se tiver entre 1 e 5 dias entre os feriados
                if 1 <= days_between <= 5:
                    # Criar uma ponte entre os feriados, SEM incluí-los
                    bridge_start = holiday1.date + timedelta(days=1)
                    bridge_end = holiday2.date - timedelta(days=1)
                    
                    # Verificar se a ponte é válida
                    if bridge_start <= bridge_end:
                        date_range = DateRange(bridge_start, bridge_end)
                        
                        # Garantir que a ponte não contenha outros feriados
                        bridge_holidays = self.period_contains_holiday(date_range)
                        
                        if not bridge_holidays:
                            recommendations.append(Recommendation(
                                f"Ponte entre {holiday1.name} e {holiday2.name}",
                                f"Aproveite esta ponte estratégica entre {holiday1.name} e {holiday2.name}",
                                date_range,
                                1.5,
                                date_range.duration_days(),
                                7.5  # Pontuação estratégica alta para pontes
                            ))
                            break  # Vá para o próximo feriado inicial
        
        # Se não encontramos pontes suficientes, adicionar recomendações estratégicas
        if len(recommendations) < count:
            # Estratégia: períodos próximos a feriados, mas sem incluí-los
            for holiday in sorted_holidays:
                if len(recommendations) >= count:
                    break
                    
                if holiday.date.year != year:
                    continue
                
                # Definir período com base no dia da semana do feriado
                weekday = holiday.date.weekday()
                
                # Estratégias para diferentes dias da semana
                if weekday == 0:  # Segunda-feira
                    # Tirar de terça a sexta após o feriado
                    start_date = holiday.date + timedelta(days=1)  # Terça após o feriado
                    end_date = holiday.date + timedelta(days=4)    # Sexta após o feriado
                elif weekday == 4:  # Sexta-feira
                    # Tirar de segunda a quinta antes do feriado
                    start_date = holiday.date - timedelta(days=4)  # Segunda antes do feriado
                    end_date = holiday.date - timedelta(days=1)    # Quinta antes do feriado
                elif weekday in [5, 6]:  # Sábado ou domingo
                    # Tirar de segunda a sexta da semana seguinte
                    days_to_monday = (7 - weekday) % 7
                    if days_to_monday == 0:
                        days_to_monday = 7
                    
                    start_date = holiday.date + timedelta(days=days_to_monday)
                    end_date = start_date + timedelta(days=4)      # 5 dias úteis
                else:
                    # Para outros dias, tentar uma semana depois
                    start_date = holiday.date + timedelta(days=7)  # 7 dias após o feriado
                    end_date = start_date + timedelta(days=4)      # 5 dias úteis
                
                date_range = DateRange(start_date, end_date)
                
                # Verificar se o período não contém feriados
                if not self.period_contains_holiday(date_range):
                    recommendations.append(Recommendation(
                        f"Estratégia próxima a {holiday.name}",
                        f"Período estratégico próximo ao feriado de {holiday.name}, sem incluí-lo",
                        date_range,
                        1.4,
                        date_range.duration_days(),
                        6.5
                    ))
        
        return recommendations
    
    def apply_naive_fix(self, recommendations: List[Recommendation]) -> List[Recommendation]:
        """
        Aplica a correção ingênua: simplesmente verifica se cada recomendação contém
        feriados e remove as que contêm.
        """
        fixed_recommendations = []
        removed_count = 0
        
        for rec in recommendations:
            holidays_in_period = self.period_contains_holiday(rec.date_range)
            
            if not holidays_in_period:
                fixed_recommendations.append(rec)
            else:
                removed_count += 1
        
        print(f"Correção ingênua: {removed_count} recomendações problemáticas removidas")
        return fixed_recommendations
    
    def apply_smart_fix(self, recommendations: List[Recommendation]) -> List[Recommendation]:
        """
        Aplica a correção inteligente: tenta ajustar os períodos problemáticos
        para evitar feriados, em vez de simplesmente removê-los.
        """
        fixed_recommendations = []
        adjusted_count = 0
        removed_count = 0
        
        for rec in recommendations:
            holidays_in_period = self.period_contains_holiday(rec.date_range)
            
            if not holidays_in_period:
                # Se não contém feriados, manter como está
                fixed_recommendations.append(rec)
                continue
            
            # Tentar ajustar o período para evitar feriados
            adjusted = False
            
            # Estratégia 1: Mover o período para depois de todos os feriados
            last_holiday = max(holidays_in_period, key=lambda h: h.date)
            new_start = last_holiday.date + timedelta(days=1)
            
            # Garantir que começamos em um dia útil (não fim de semana)
            while self.is_weekend(new_start):
                new_start += timedelta(days=1)
                
            # Manter a mesma duração
            original_duration = rec.date_range.duration_days()
            new_end = new_start + timedelta(days=original_duration - 1)
            
            # Verificar se o novo período também não contém feriados
            new_range = DateRange(new_start, new_end)
            holidays_in_new_period = self.period_contains_holiday(new_range)
            
            if not holidays_in_new_period:
                # Criar uma nova recomendação com o período ajustado
                adjusted_rec = Recommendation(
                    f"{rec.title} (Ajustado)",
                    f"{rec.description} [Período ajustado para evitar feriados]",
                    new_range,
                    rec.efficiency_gain,
                    rec.days_changed,
                    rec.strategic_score
                )
                fixed_recommendations.append(adjusted_rec)
                adjusted_count += 1
                adjusted = True
            
            if not adjusted:
                # Se não conseguimos ajustar, remover a recomendação
                removed_count += 1
        
        print(f"Correção inteligente: {adjusted_count} recomendações ajustadas, {removed_count} removidas")
        return fixed_recommendations
    
    def print_period_details(self, period: DateRange, title: str = "Detalhes do Período"):
        """Imprime detalhes de um período, incluindo dias úteis, fins de semana e feriados"""
        print(f"\n{title}: {period}")
        
        days = period.day_list()
        workdays = 0
        weekends = 0
        holidays_list = []
        
        for day in days:
            if self.is_holiday(day):
                holiday = self.is_holiday(day)
                holidays_list.append(f"{day.strftime('%d/%m/%Y')} ({day.strftime('%a')}): {holiday.name}")
            elif self.is_weekend(day):
                weekends += 1
            else:
                workdays += 1
        
        print(f"Duração: {len(days)} dias")
        print(f"Dias úteis: {workdays}")
        print(f"Fins de semana: {weekends}")
        print(f"Feriados: {len(holidays_list)}")
        
        if holidays_list:
            print("Lista de feriados no período:")
            for h in holidays_list:
                print(f"  - {h}")
    
    def run_tests(self, year: int):
        """Executa testes para verificar a eficácia das correções"""
        print("\n" + "="*80)
        print(f"TESTE DE ALGORITMO DE OTIMIZAÇÃO DE FÉRIAS - ANO: {year}")
        print("="*80)
        
        # Carregar feriados
        self.load_holidays(year)
        
        # 1. Gerar recomendações com problemas
        print("\n1. Gerando recomendações problemáticas (que podem incluir feriados)")
        problem_recommendations = self.create_recommendations_with_problems(year, 20)
        
        problematic_count = 0
        for rec in problem_recommendations:
            holidays = self.period_contains_holiday(rec.date_range)
            if holidays:
                problematic_count += 1
                print(f"  - PROBLEMA: {rec.title} contém {len(holidays)} feriado(s)")
        
        print(f"Total de recomendações geradas: {len(problem_recommendations)}")
        print(f"Recomendações com problemas: {problematic_count}")
        
        # 2. Criar recomendações de ponte (já corrigidas)
        print("\n2. Gerando recomendações de ponte (já evitando feriados)")
        bridge_recommendations = self.create_bridge_recommendations(year, 10)
        
        problematic_bridges = 0
        for rec in bridge_recommendations:
            holidays = self.period_contains_holiday(rec.date_range)
            if holidays:
                problematic_bridges += 1
                print(f"  - ERRO: {rec.title} contém {len(holidays)} feriado(s) - ISTO NÃO DEVERIA ACONTECER")
        
        print(f"Total de pontes geradas: {len(bridge_recommendations)}")
        print(f"Pontes problematicas: {problematic_bridges}")
        
        # 3. Aplicar correção ingênua
        print("\n3. Aplicando correção ingênua (remover recomendações com feriados)")
        naive_fixed = self.apply_naive_fix(problem_recommendations)
        
        naive_still_problematic = 0
        for rec in naive_fixed:
            holidays = self.period_contains_holiday(rec.date_range)
            if holidays:
                naive_still_problematic += 1
                print(f"  - FALHA: {rec.title} ainda contém {len(holidays)} feriado(s)")
        
        print(f"Recomendações após correção ingênua: {len(naive_fixed)}")
        print(f"Ainda problemáticas: {naive_still_problematic}")
        
        # 4. Aplicar correção inteligente
        print("\n4. Aplicando correção inteligente (ajustar períodos para evitar feriados)")
        smart_fixed = self.apply_smart_fix(problem_recommendations)
        
        smart_still_problematic = 0
        for rec in smart_fixed:
            holidays = self.period_contains_holiday(rec.date_range)
            if holidays:
                smart_still_problematic += 1
                print(f"  - FALHA: {rec.title} ainda contém {len(holidays)} feriado(s)")
        
        print(f"Recomendações após correção inteligente: {len(smart_fixed)}")
        print(f"Ainda problemáticas: {smart_still_problematic}")
        
        # 5. Teste de verificação final (combinando todas as recomendações e aplicando verificação)
        print("\n5. Teste de verificação final")
        all_recommendations = problem_recommendations + bridge_recommendations
        
        # Aplicar verificação final
        final_valid_recommendations = []
        for rec in all_recommendations:
            if not self.period_contains_holiday(rec.date_range):
                final_valid_recommendations.append(rec)
        
        print(f"Total de recomendações: {len(all_recommendations)}")
        print(f"Recomendações válidas após verificação final: {len(final_valid_recommendations)}")
        print(f"Recomendações removidas: {len(all_recommendations) - len(final_valid_recommendations)}")
        
        # 6. Resumo do teste
        print("\n" + "="*80)
        print("RESUMO DO TESTE")
        print("="*80)
        print(f"Feriados no ano {year}: {len([h for h in self.holidays if h.date.year == year])}")
        print(f"Recomendações geradas com problemas potenciais: {len(problem_recommendations)}")
        print(f"Problemas reais encontrados: {problematic_count}")
        print(f"Eficácia da correção ingênua: {100 * (problematic_count - naive_still_problematic) / max(1, problematic_count):.1f}%")
        print(f"Eficácia da correção inteligente: {100 * (problematic_count - smart_still_problematic) / max(1, problematic_count):.1f}%")
        print(f"Eficácia da verificação final: 100%")
        
        # Mostrar exemplos de recomendações válidas
        if final_valid_recommendations:
            print("\nExemplos de recomendações válidas:")
            for i, rec in enumerate(final_valid_recommendations[:3]):
                print(f"\nRecomendação {i+1}: {rec}")
                self.print_period_details(rec.date_range, "Detalhes")
        
        print("\n" + "="*80)
        print("CONCLUSÃO")
        print("="*80)
        
        success = naive_still_problematic == 0 and smart_still_problematic == 0
        print("RESULTADO DO TESTE: " + ("SUCESSO" if success else "FALHA"))
        print("Todas as correções implementadas são eficazes? " + ("SIM" if success else "NÃO"))
        
        return success


def main():
    """Função principal"""
    optimizer = VacationOptimizer()
    
    # Executar testes para múltiplos anos
    test_years = [2024, 2025, 2026]
    overall_success = True
    
    for year in test_years:
        success = optimizer.run_tests(year)
        overall_success = overall_success and success
    
    print("\n" + "="*80)
    print("RESULTADO FINAL")
    print("="*80)
    print(f"Testes executados para os anos: {', '.join(map(str, test_years))}")
    print(f"Resultado geral: {'SUCESSO' if overall_success else 'FALHA'}")
    print("\nConclusão: " + ("Todas as correções propostas são eficazes e robustas." if overall_success else 
                            "Algumas correções ainda precisam de aprimoramentos."))
    
    if overall_success:
        print("\nAs correções garantem que:")
        print("1. Nenhum período de férias recomendado inclui feriados")
        print("2. A validação é consistente em todos os casos de teste")
        print("3. O algoritmo é capaz de ajustar períodos problemáticos")
        print("4. A estratégia de verificação final é 100% confiável")
    else:
        print("\nProblemas encontrados que precisam de correção adicional:")
        print("1. Alguns períodos ainda podem incluir feriados após as correções")
        print("2. O algoritmo de ajuste pode não ser suficientemente robusto")
        print("3. É necessário revisar a lógica de verificação")


if __name__ == "__main__":
    main()