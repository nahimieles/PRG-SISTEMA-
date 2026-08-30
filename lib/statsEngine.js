
export const getDashboardIndicators = (records = [], fileLogs = []) => {

    const hoursByCompany = {};
    const hoursByWorker = {};
    const SYSTEM_NAMES = ['desconocido', 'usuario desconocido', 'sharepoint', 'system', 'onedrive', 'app@sharepoint'];

    let totalHours = 0;
    let totalActivities = 0;

    const correctName = (name) => {
        if (!name) return 'Sin Nombre';
        let corrected = name.trim().replace(/\s+/g, ' ');
        const normalized = corrected.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (normalized.includes('paul rodriguez')) return 'Paul Rodríguez García';
        if (normalized.includes('danny suarez')) return 'Danny Suárez';
        if (normalized.includes('eddy campuzano') || normalized.includes('prg.audex')) return 'Eddy Campuzano';
        if (normalized.includes('maria teresa') || normalized.includes('lissbeth') || normalized.includes('lisbeth')) return 'Maria Teresa Fernández Bravo';
        if (normalized.includes('valeria almeida')) return 'Eddy Campuzano';
        return corrected;
    };

    records.forEach(r => {
        const worker = correctName(r.worker_name);
        if (SYSTEM_NAMES.includes(worker.toLowerCase())) return;
        const company = r.company_name || 'Sin Empresa';
        const hours = parseFloat(r.hours_worked) || 0;

        hoursByCompany[company] = (hoursByCompany[company] || 0) + hours;
        hoursByWorker[worker] = (hoursByWorker[worker] || 0) + hours;

        totalHours += hours;
        totalActivities += 1;
    });

    fileLogs.forEach(log => {
        const worker = correctName(log.worker_name);
        if (SYSTEM_NAMES.includes(worker.toLowerCase())) return;
        const company = log.company_name || 'Sin Empresa';

        hoursByCompany[company] = (hoursByCompany[company] || 0) + 1;
        hoursByWorker[worker] = (hoursByWorker[worker] || 0) + 1;
        totalActivities += 1;
    });

    const topCompanies = Object.entries(hoursByCompany)
        .map(([name, value]) => ({ 
            name: name.length > 18 ? name.substring(0, 18) + '...' : name, 
            fullName: name,
            value: parseFloat(value.toFixed(2)) 
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

    const workerProductivity = Object.entries(hoursByWorker)
        .map(([name, value]) => ({ 
            name, 
            value: parseFloat(value.toFixed(2)) 
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

    return {
        topCompanies,
        workerProductivity,
        totals: {
            hours: parseFloat(totalHours.toFixed(2)),
            activities: totalActivities,
            companiesCount: Object.keys(hoursByCompany).length,
            workersCount: Object.keys(hoursByWorker).length
        }
    };
};

export const getCompanyIndicators = (companyName, records = []) => {
    const companyRecords = records.filter(r => r.company_name === companyName);

    const workerDistribution = {};
    let totalHours = 0;

    companyRecords.forEach(r => {
        const worker = r.worker_name || 'Desconocido';
        const hours = parseFloat(r.hours_worked) || 0;
        workerDistribution[worker] = (workerDistribution[worker] || 0) + hours;
        totalHours += hours;
    });

    return {
        totalHours,
        totalActivities: companyRecords.length,
        workerDistribution: Object.entries(workerDistribution).map(([name, value]) => ({ name, value }))
    };
};

export const getComplianceIndicators = (records = [], settings = {}) => {

    return {};
};
