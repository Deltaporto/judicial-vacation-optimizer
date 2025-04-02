import { mockMunicipalities, getMockHolidays } from './mockTRF2Data';
/**
 * Verifica se estamos em ambiente de desenvolvimento local
 * para evitar problemas de CORS
 */
function isLocalDevelopment() {
    return window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
}
/**
 * Função que faz web scraping da página de feriados do TRF2
 * e converte para o formato usado pela aplicação.
 *
 * @param year Ano para buscar os feriados (opcional, padrão é o ano atual)
 * @param abrangencia Filtro de abrangência: 'All', '0' (Nacional), '1' (Estadual) ou '2' (Municipal)
 * @returns Promise com array de feriados no formato da aplicação
 */
export async function fetchTRF2Holidays(year = new Date().getFullYear(), abrangencia = 'All', municipality) {
    // Se estiver em desenvolvimento local, use dados simulados
    if (isLocalDevelopment()) {
        console.log(`[DEV] Usando dados de feriados simulados para o ano ${year} (tipo: ${abrangencia})`);
        return getMockHolidays(year, abrangencia, municipality);
    }
    try {
        // URL da página de feriados do TRF2
        const url = new URL('https://www.trf2.jus.br/trf2/atendimento/prazos-suspensos-feriados');
        // Adiciona parâmetros de busca
        url.searchParams.append('field_data_ano_limite2_value', year.toString());
        if (abrangencia !== 'All') {
            url.searchParams.append('field_nacional_ou_estadual_value', abrangencia);
        }
        // Faz a requisição HTTP
        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error(`Erro ao buscar feriados: ${response.status}`);
        }
        const html = await response.text();
        // Usa um parser DOM para extrair os dados da tabela
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        // Encontra a tabela de feriados
        const rows = doc.querySelectorAll('table.table tbody tr');
        const holidays = [];
        rows.forEach(row => {
            const columns = row.querySelectorAll('td');
            if (columns.length >= 3) {
                // Extrai as informações das colunas
                const dateText = columns[0].textContent?.trim() || '';
                const holidayName = columns[1].textContent?.trim().replace(/\s+/g, ' ') || '';
                const abrangenciaText = columns[2].textContent?.trim() || '';
                // Trata o texto da data para extrair as datas
                const dates = extractDatesFromText(dateText, year);
                // Determina o tipo do feriado
                let type = 'judicial'; // Padrão
                if (abrangenciaText.includes('Nacional')) {
                    type = 'national';
                }
                if (holidayName.toLowerCase().includes('recesso')) {
                    type = 'recess';
                }
                // Cria um objeto Holiday para cada data
                dates.forEach(date => {
                    holidays.push({
                        date,
                        name: holidayName,
                        type,
                        abrangencia: abrangenciaText
                    });
                });
            }
        });
        return holidays;
    }
    catch (error) {
        console.error('Erro ao obter feriados do TRF2:', error);
        return [];
    }
}
/**
 * Função auxiliar para extrair datas de textos como "Sex, 20/Dez a Seg, 06/Jan"
 */
function extractDatesFromText(dateText, year) {
    const dates = [];
    // Se o texto contém "a" entre datas, é um período
    if (dateText.includes(' a ')) {
        const [startDateText, endDateText] = dateText.split(' a ');
        // Extrai as datas de início e fim
        const startDate = parseBrazilianDate(startDateText, year);
        const endDate = parseBrazilianDate(endDateText, year);
        if (startDate && endDate) {
            // Gera todas as datas do período
            const currentDate = new Date(startDate);
            while (currentDate <= new Date(endDate)) {
                dates.push(currentDate.toISOString().split('T')[0]);
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
    }
    else {
        // É apenas uma data única
        const date = parseBrazilianDate(dateText, year);
        if (date) {
            dates.push(date);
        }
    }
    return dates;
}
/**
 * Função auxiliar para converter datas no formato brasileiro para ISO
 * Ex: "Sex, 20/Dez" => "2023-12-20"
 */
function parseBrazilianDate(dateText, year) {
    try {
        // Remove o dia da semana
        const dateOnly = dateText.split(',')[1]?.trim() || dateText.trim();
        // Extrai dia e mês
        const [day, month] = dateOnly.split('/');
        if (!day || !month)
            return null;
        // Converte o mês abreviado para número
        const monthNumber = getMonthNumber(month);
        if (monthNumber === -1)
            return null;
        // Se for janeiro e a data for no início do ano, 
        // pode ser que seja janeiro do ano seguinte (recesso)
        let yearToUse = year;
        if (monthNumber === 0 && parseInt(day) < 15) {
            yearToUse = year + 1;
        }
        // Formata a data no formato ISO
        return `${yearToUse}-${(monthNumber + 1).toString().padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    catch (e) {
        console.error('Erro ao parsear data:', dateText, e);
        return null;
    }
}
/**
 * Função auxiliar para converter mês abreviado em português para número (0-11)
 */
function getMonthNumber(month) {
    const months = {
        'jan': 0,
        'fev': 1,
        'mar': 2,
        'abr': 3,
        'mai': 4,
        'jun': 5,
        'jul': 6,
        'ago': 7,
        'set': 8,
        'out': 9,
        'nov': 10,
        'dez': 11
    };
    // Converte para minúsculo e remove acentos
    const normalized = month.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    // Encontra o mês que começa com o texto normalizado
    for (const [key, value] of Object.entries(months)) {
        if (normalized.startsWith(key)) {
            return value;
        }
    }
    return -1;
}
/**
 * Função para obter a lista de municípios com feriados no TRF2
 *
 * @param year Ano para buscar os municípios
 * @returns Promise com array de municípios
 */
export async function fetchTRF2Municipalities(year = new Date().getFullYear()) {
    // Se estiver em desenvolvimento local, use dados simulados
    if (isLocalDevelopment()) {
        console.log(`[DEV] Usando lista de municípios simulada para o ano ${year}`);
        return new Promise(resolve => {
            // Simulando um pequeno delay para parecer uma chamada de rede real
            setTimeout(() => {
                resolve(mockMunicipalities);
            }, 500);
        });
    }
    try {
        console.log(`Buscando municípios para o ano ${year}...`);
        // URL da página de feriados do TRF2
        const url = new URL('https://www.trf2.jus.br/trf2/atendimento/prazos-suspensos-feriados');
        // Adiciona parâmetros de busca
        url.searchParams.append('field_data_ano_limite2_value', year.toString());
        // Filtra apenas por feriados municipais
        url.searchParams.append('field_nacional_ou_estadual_value', '2');
        console.log(`URL de busca: ${url.toString()}`);
        try {
            // Faz a requisição HTTP
            const response = await fetch(url.toString(), {
                mode: 'cors',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                }
            });
            if (!response.ok) {
                console.error(`Erro HTTP ao buscar municípios: ${response.status}`);
                throw new Error(`Erro ao buscar municípios: ${response.status}`);
            }
            const html = await response.text();
            console.log(`Tamanho do HTML recebido: ${html.length} caracteres`);
            // Usa um parser DOM para extrair os dados da tabela
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            // Encontra a tabela de feriados
            const table = doc.querySelector('table.table');
            if (!table) {
                console.error('Tabela de feriados não encontrada no HTML');
                throw new Error('Tabela de feriados não encontrada');
            }
            const rows = table.querySelectorAll('tbody tr');
            console.log(`Número de linhas na tabela: ${rows.length}`);
            // Set para evitar duplicações de municípios
            const municipalitiesSet = new Set();
            rows.forEach((row, index) => {
                const columns = row.querySelectorAll('td');
                if (columns.length >= 3) {
                    // Extrai a informação de abrangência (3ª coluna)
                    const abrangenciaText = columns[2].textContent?.trim() || '';
                    // Verifica se é um feriado municipal
                    if (abrangenciaText.includes('Municipal')) {
                        console.log(`Linha ${index}: Encontrado feriado municipal: ${abrangenciaText}`);
                        // Extrai o nome do município entre parênteses
                        const match = abrangenciaText.match(/Municipal\s*\(([^)]+)\)/i);
                        if (match && match[1]) {
                            const municipality = match[1].trim();
                            console.log(`Município extraído: ${municipality}`);
                            municipalitiesSet.add(municipality);
                        }
                        else {
                            console.log(`Não foi possível extrair município de: ${abrangenciaText}`);
                        }
                    }
                }
            });
            const municipalitiesList = Array.from(municipalitiesSet).sort();
            console.log(`Municípios encontrados (${municipalitiesList.length}): ${municipalitiesList.join(', ')}`);
            // Se não encontrou municípios, retornar lista de fallback
            if (municipalitiesList.length === 0) {
                console.log('Usando lista de municípios de fallback');
                return getFallbackMunicipalities();
            }
            // Converte o Set para array e ordena alfabeticamente
            return municipalitiesList;
        }
        catch (fetchError) {
            console.error('Erro no fetch:', fetchError);
            console.log('Usando lista de municípios de fallback devido a erro no fetch');
            return getFallbackMunicipalities();
        }
    }
    catch (error) {
        console.error('Erro ao obter municípios do TRF2:', error);
        return getFallbackMunicipalities();
    }
}
/**
 * Retorna uma lista de municípios de fallback quando não é possível buscar do TRF2
 * Esta lista inclui os municípios mais comuns com feriados no TRF2
 */
function getFallbackMunicipalities() {
    return [
        'Rio de Janeiro',
        'Niterói',
        'Campos dos Goytacazes',
        'Duque de Caxias',
        'Petrópolis',
        'Nova Iguaçu',
        'São João de Meriti',
        'Três Rios',
        'Vitória',
        'Vila Velha',
        'Cachoeiro de Itapemirim',
        'São Mateus',
        'Macaé',
        'Volta Redonda',
        'Cabo Frio',
        'Itaboraí',
        'Armação dos Búzios',
        'Teresópolis',
        'Nova Friburgo',
        'Magé',
        'Angra dos Reis',
        'Itaperuna',
        'Resende',
        'Araruama',
        'Barra Mansa',
        'São Pedro da Aldeia'
    ].sort();
}
/**
 * Função para mesclar feriados do TRF2 com os feriados existentes
 * evitando duplicação e dando prioridade para dados do TRF2
 */
export function mergeHolidays(existingHolidays, trf2Holidays) {
    console.log("[mergeHolidays] Iniciando mesclagem de feriados");
    console.log(`[mergeHolidays] Feriados existentes: ${existingHolidays.length}`);
    console.log(`[mergeHolidays] Feriados a importar: ${trf2Holidays.length}`);
    // Cria um mapa dos feriados existentes por data
    const holidayMap = new Map();
    // Adiciona os feriados existentes ao mapa
    existingHolidays.forEach(holiday => {
        holidayMap.set(holiday.date, holiday);
    });
    // Verifica quais feriados são municipais (para logs)
    const municipalHolidays = trf2Holidays.filter(h => h.abrangencia && h.abrangencia.toLowerCase().includes('municipal'));
    console.log(`[mergeHolidays] Feriados municipais a importar: ${municipalHolidays.length}`);
    // Substitui ou adiciona feriados do TRF2
    trf2Holidays.forEach(holiday => {
        // Verificação adicional para feriados municipais
        if (holiday.abrangencia && holiday.abrangencia.toLowerCase().includes('municipal')) {
            console.log(`[mergeHolidays] Adicionando/atualizando feriado municipal: ${holiday.name} (${holiday.date})`);
        }
        holidayMap.set(holiday.date, holiday);
    });
    // Converte o mapa de volta para array
    const result = Array.from(holidayMap.values());
    console.log(`[mergeHolidays] Total de feriados após mesclagem: ${result.length}`);
    return result;
}
/**
 * Função para filtrar feriados municipais de um município específico
 *
 * @param holidays Lista de feriados a ser filtrada
 * @param municipality Nome do município para filtrar
 * @returns Lista de feriados filtrada apenas com os do município especificado
 */
export function filterMunicipalHolidaysForMunicipality(holidays, municipality) {
    console.log(`Filtrando feriados para o município: ${municipality}`);
    console.log(`Total de feriados antes da filtragem: ${holidays.length}`);
    // Convertemos para lowercase e removemos acentos para comparação
    const normalizedMunicipality = municipality
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    const filteredHolidays = holidays.filter(holiday => {
        // Para cada feriado, verificamos se o nome ou a descrição contém o nome do município
        const abrangencia = holiday.abrangencia || '';
        // Verifica se o feriado tem informação de abrangência municipal
        const isMunicipal = abrangencia.toLowerCase().includes('municipal');
        if (!isMunicipal) {
            return false;
        }
        // Normalizamos o texto de abrangência para comparação
        const normalizedAbrangencia = abrangencia
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
        // Verifica se o município está na abrangência
        // Testamos diferentes variações de como o município pode aparecer
        return (normalizedAbrangencia.includes(`municipal (${normalizedMunicipality})`) ||
            normalizedAbrangencia.includes(`municipal(${normalizedMunicipality})`) ||
            normalizedAbrangencia.includes(`municipal - ${normalizedMunicipality}`) ||
            normalizedAbrangencia.includes(`municipal: ${normalizedMunicipality}`) ||
            normalizedAbrangencia.includes(`municipal ${normalizedMunicipality}`) ||
            // Verifica o nome do feriado também
            holiday.name.toLowerCase().includes(normalizedMunicipality));
    });
    console.log(`Feriados encontrados para ${municipality}: ${filteredHolidays.length}`);
    // Se não encontrou nenhum feriado, procurar com lógica menos restritiva
    if (filteredHolidays.length === 0) {
        console.log('Tentando busca menos restritiva...');
        // Extrair parte inicial do nome do município (até o primeiro espaço)
        // Ex: "Rio de Janeiro" -> "Rio"
        const simplifiedMunicipality = normalizedMunicipality.split(' ')[0];
        // Se o nome simplificado tem pelo menos 3 caracteres, usar para busca
        if (simplifiedMunicipality.length >= 3) {
            console.log(`Usando nome simplificado: ${simplifiedMunicipality}`);
            const simplifiedFiltered = holidays.filter(holiday => {
                const abrangencia = (holiday.abrangencia || '').toLowerCase();
                if (!abrangencia.includes('municipal')) {
                    return false;
                }
                return (abrangencia.includes(simplifiedMunicipality) ||
                    holiday.name.toLowerCase().includes(simplifiedMunicipality));
            });
            console.log(`Feriados encontrados com busca simplificada: ${simplifiedFiltered.length}`);
            if (simplifiedFiltered.length > 0) {
                return simplifiedFiltered;
            }
        }
        // Se ainda não encontrou nada, retornar alguns feriados municipais genéricos
        console.log('Retornando feriados municipais genéricos');
        return holidays
            .filter(h => (h.abrangencia || '').toLowerCase().includes('municipal'))
            .slice(0, 3); // Limitar a 3 feriados para não poluir o calendário
    }
    return filteredHolidays;
}
