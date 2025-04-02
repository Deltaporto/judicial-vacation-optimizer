/**
 * Lista de todos os municípios disponíveis
 */
export const allMunicipalities = [
    'Angra dos Reis',
    'Araruama',
    'Armação dos Búzios',
    'Barra do Piraí',
    'Barra Mansa',
    'Cabo Frio',
    'Cachoeiro de Itapemirim',
    'Campos dos Goytacazes',
    'Duque de Caxias',
    'Itaboraí',
    'Itaperuna',
    'Macaé',
    'Magé',
    'Niterói',
    'Nova Friburgo',
    'Nova Iguaçu',
    'Petrópolis',
    'Resende',
    'Rio de Janeiro',
    'São Gonçalo',
    'São João de Meriti',
    'São Pedro da Aldeia',
    'Teresópolis',
    'Três Rios',
    'Vila Velha',
    'Vitória',
    'Volta Redonda'
];
/**
 * Modelos de feriados por município - dia e mês sem o ano
 * Isso permite gerar feriados para qualquer ano
 */
export const municipalHolidayTemplates = {
    'Rio de Janeiro': [
        { date: '01-20', name: 'Dia de São Sebastião' },
        { date: '04-23', name: 'Dia de São Jorge' },
        { date: '11-20', name: 'Dia da Consciência Negra' }
    ],
    'Niterói': [
        { date: '05-22', name: 'Aniversário de Niterói' },
        { date: '11-22', name: 'Dia de Santa Cecília' },
        { date: '11-20', name: 'Dia da Consciência Negra' }
    ],
    'Angra dos Reis': [
        { date: '01-06', name: 'Dia de Reis (Aniversário de Angra)' },
        { date: '11-20', name: 'Dia da Consciência Negra' }
    ],
    'São Gonçalo': [
        { date: '09-22', name: 'Aniversário de São Gonçalo' },
        { date: '11-20', name: 'Dia da Consciência Negra' }
    ],
    'Duque de Caxias': [
        { date: '08-25', name: 'Aniversário de Duque de Caxias' },
        { date: '11-20', name: 'Dia da Consciência Negra' },
        { date: '06-13', name: 'Dia de Santo Antônio' }
    ],
    'Nova Iguaçu': [
        { date: '01-15', name: 'Aniversário da Cidade - Ponto Facultativo (Nova Iguaçu)' },
        { date: '11-20', name: 'Dia da Consciência Negra' },
        { date: '06-13', name: 'Dia de Santo Antônio' }
    ],
    'São João de Meriti': [
        { date: '04-19', name: 'Aniversário de São João de Meriti' },
        { date: '11-20', name: 'Dia da Consciência Negra' },
        { date: '06-24', name: 'Dia de São João' }
    ],
    'Petrópolis': [
        { date: '03-16', name: 'Aniversário de Petrópolis' },
        { date: '11-20', name: 'Dia da Consciência Negra' }
    ],
    'Volta Redonda': [
        { date: '07-17', name: 'Aniversário da Cidade - Volta Redonda' },
        { date: '11-20', name: 'Dia da Consciência Negra' },
        { date: '06-13', name: 'Dia de Santo Antônio' }
    ],
    'Campos dos Goytacazes': [
        { date: '05-28', name: 'Aniversário de Campos dos Goytacazes' },
        { date: '10-28', name: 'Dia de São Judas Tadeu' },
        { date: '11-20', name: 'Dia da Consciência Negra' },
        { date: '01-15', name: 'Dia de Santo Amaro' },
        { date: '08-06', name: 'Dia de São Salvador' }
    ],
    'Macaé': [
        { date: '07-29', name: 'Aniversário da Cidade - Macaé' },
        { date: '11-20', name: 'Dia da Consciência Negra' },
        { date: '06-24', name: 'Dia de São João' }
    ],
    'Cabo Frio': [
        { date: '11-13', name: 'Aniversário de Cabo Frio' },
        { date: '11-20', name: 'Dia da Consciência Negra' }
    ],
    'Nova Friburgo': [
        { date: '05-16', name: 'Aniversário da Cidade - Nova Friburgo' },
        { date: '11-20', name: 'Dia da Consciência Negra' }
    ],
    'Teresópolis': [
        { date: '07-06', name: 'Aniversário de Teresópolis' },
        { date: '11-20', name: 'Dia da Consciência Negra' },
        { date: '06-13', name: 'Dia de Santo Antônio' },
        { date: '10-15', name: 'Dia de Santa Teresa' }
    ],
    'Vitória': [
        { date: '09-08', name: 'Dia de Nossa Senhora da Vitória' },
        { date: '11-20', name: 'Dia da Consciência Negra' }
    ],
    'Vila Velha': [
        { date: '05-23', name: 'Aniversário de Vila Velha' },
        { date: '11-20', name: 'Dia da Consciência Negra' }
    ],
    'Cachoeiro de Itapemirim': [
        { date: '06-29', name: 'Aniversário de Cachoeiro de Itapemirim' },
        { date: '11-20', name: 'Dia da Consciência Negra' }
    ],
    'Itaperuna': [
        { date: '05-10', name: 'Aniversário da Cidade - Itaperuna' },
        { date: '03-19', name: 'Dia de São José' }
    ],
    'Itaboraí': [
        { date: '05-22', name: 'Aniversário da Cidade - Itaboraí' },
        { date: '06-24', name: 'Dia de São João' }
    ],
    'Magé': [
        { date: '06-09', name: 'Aniversário da Cidade - Magé' },
        { date: '09-15', name: 'Dia de Nossa Senhora da Piedade' }
    ],
    'Resende': [
        { date: '09-29', name: 'Aniversário da Cidade - Resende' }
    ],
    'São Pedro da Aldeia': [
        { date: '05-16', name: 'Aniversário da Cidade - São Pedro da Aldeia' }
    ],
    'Barra do Piraí': [
        { date: '03-10', name: 'Aniversário da Cidade' }
    ],
    'Três Rios': [
        { date: '01-20', name: 'Dia de São Sebastião' }
    ]
};
/**
 * Feriados padrão para municípios que não têm específicos
 */
export const defaultMunicipalHolidays = [
    { date: '11-20', name: 'Dia da Consciência Negra' }
];
/**
 * Eventos específicos que ocorrem uma única vez em data definida
 * Formato: ano-mês-dia completo
 */
export const specificEvents = {
    'São Gonçalo': [
        { date: '2025-02-25', name: 'Evento de inauguração das novas instalações da Subseção Judiciária de São Gonçalo' }
    ],
    'Rio de Janeiro': [
        { date: '2025-02-28', name: 'Sexta-feira de Carnaval (apenas na Capital)' }
    ]
};
/**
 * Gera os feriados municipais para um município e ano específicos
 */
export function getMunicipalHolidays(municipality, year) {
    const holidays = [];
    // Log para depuração
    console.log(`[DEBUG] Gerando feriados para ${municipality} (${year})`);
    // Obtém os templates de feriados para o município ou usa o padrão
    const templates = municipalHolidayTemplates[municipality] || defaultMunicipalHolidays;
    console.log(`[DEBUG] Templates encontrados:`, JSON.stringify(templates));
    // Converte os templates para objetos Holiday completos com o ano especificado
    templates.forEach(template => {
        // Extrai mês e dia da string no formato MM-DD
        const [month, day] = template.date.split('-');
        // Cria uma data formatada no padrão YYYY-MM-DD garantindo que seja interpretada corretamente
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        // Verifica se o nome do feriado já contém o nome do município entre parênteses
        let holidayName = template.name;
        if (!holidayName.includes(`(${municipality})`) && !holidayName.includes(`(${municipality} -`) &&
            !holidayName.includes(`(${municipality}-`) && !holidayName.includes(`- ${municipality})`) &&
            !holidayName.includes(`-${municipality})`)) {
            // Verifica se já existe algum parêntese no nome
            if (holidayName.includes('(') && holidayName.includes(')')) {
                // Já existe parêntese, então vamos adicionar o município ao conteúdo existente
                holidayName = holidayName.replace(/\((.*?)\)/, `($1 - ${municipality})`);
            }
            else {
                // Não existe parêntese, então vamos adicionar no final
                holidayName = `${holidayName} (${municipality})`;
            }
        }
        const holiday = {
            date: formattedDate,
            name: holidayName,
            type: 'judicial',
            abrangencia: `Municipal (${municipality})`
        };
        console.log(`[DEBUG] Criado feriado municipal: ${holiday.name}, data: ${holiday.date}, tipo: ${holiday.type}, abrangência: ${holiday.abrangencia}`);
        holidays.push(holiday);
    });
    // Adiciona eventos específicos se existirem para este município e ano
    const events = specificEvents[municipality] || [];
    events.forEach(event => {
        // Extrai o ano do evento para verificar se corresponde ao ano solicitado
        const eventYear = parseInt(event.date.split('-')[0]);
        if (eventYear === year) {
            // Verifica se o nome do evento já contém o nome do município entre parênteses
            let eventName = event.name;
            if (!eventName.includes(`(${municipality})`) && !eventName.includes(`(${municipality} -`) &&
                !eventName.includes(`(${municipality}-`) && !eventName.includes(`- ${municipality})`) &&
                !eventName.includes(`-${municipality})`)) {
                // Verifica se já existe algum parêntese no nome
                if (eventName.includes('(') && eventName.includes(')')) {
                    // Já existe parêntese, então vamos adicionar o município ao conteúdo existente
                    eventName = eventName.replace(/\((.*?)\)/, `($1 - ${municipality})`);
                }
                else {
                    // Não existe parêntese, então vamos adicionar no final
                    eventName = `${eventName} (${municipality})`;
                }
            }
            const holiday = {
                date: event.date,
                name: eventName,
                type: 'judicial',
                abrangencia: `Municipal (${municipality})`
            };
            console.log(`[DEBUG] Adicionado evento específico: ${holiday.name}, data: ${holiday.date}, tipo: ${holiday.type}, abrangência: ${holiday.abrangencia}`);
            holidays.push(holiday);
        }
    });
    console.log(`[DEBUG] Total de feriados municipais gerados para ${municipality}: ${holidays.length}`);
    holidays.forEach((h, index) => {
        console.log(`[DEBUG] Feriado #${index + 1}: ${h.name} (${h.date}), tipo: ${h.type}`);
    });
    return holidays;
}
/**
 * Retorna todos os feriados municipais para todos os municípios em um ano específico
 */
export function getAllMunicipalHolidays(year) {
    const allHolidays = [];
    for (const municipality of allMunicipalities) {
        const municipalHolidays = getMunicipalHolidays(municipality, year);
        allHolidays.push(...municipalHolidays);
    }
    return allHolidays;
}
