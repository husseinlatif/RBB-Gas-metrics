const axios = require('axios');
const _ = require('lodash');
const cron = require('node-cron');

//Substituir com o endereco de sua API do Blockscout.
const API_URL = 'http://URL/api/v2'; 

//Substituir com a frequencia de execucao desejada.
const cron_expression = '0 0 * * *'

//Recupera todas as transações da chain, pagina por pagina.
async function fetchAllTransactions() {
    let allTransactions = [];
    let nextPageParams = null;
    
    do {
        try {
            const url = nextPageParams 
                ? `${API_URL}/transactions?block_number=${nextPageParams.block_number}&index=${nextPageParams.index}&items_count=${nextPageParams.items_count}`
                : `${API_URL}/transactions`;
            
            const response = await axios.get(url);
            const transactions = response.data.items;
            allTransactions = allTransactions.concat(transactions);
            
            nextPageParams = response.data.next_page_params || null;

        } catch (error) {
            console.error('Error fetching transactions:', error);
            break;
        }
    } while (nextPageParams);

    return allTransactions;
}

//Agrupa as transacoes com base no hash/address do remetente.
function groupBySender(transactions) {
    return _.groupBy(transactions, transaction => transaction.from.hash);
}

//Itera sob as transacoes de cada remetente/grupo, somando o total de gas utilizado nas transacoes.
function calculateTotalGasBySender(groupedTransactions) {
    const result = {};
    
    for (const [sender, txs] of Object.entries(groupedTransactions)) {
        const totalGas = txs.reduce((sum, tx) => sum + parseFloat(tx.gas_used), 0);
        result[sender] = totalGas;
    }
    
    return result;
}


//Funcao main. Sera executada cada vez que o scheduler executar, de acordo com a frequencia desejada.
async function main() {
    const transactions = await fetchAllTransactions();
    const groupedTransactions = groupBySender(transactions);
    const gasUsageBySender = calculateTotalGasBySender(groupedTransactions);
    
    console.log('Gas total utilizado por entidade:', gasUsageBySender);
}


//Iniciando o scheduler.
cron.schedule(cron_expression, async () => {
    console.log('Executando os calculos consumo de gas..');
    await main();
});

console.log(`Aplicacao iniciada. Calculos de uso de gas sendo realizados na frequencia: ${cron_expression}`)