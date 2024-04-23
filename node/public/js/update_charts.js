function updateCharts() {
    const days = document.getElementById('days').value;
    loadHRByDateData(days);
    loadHrvByDateAreaData(days);
    loadHrvByDateScatterData(days);
    loadSpo2ByDateBarData(days);
    loadSpo2ByDateScatterData(days);
    loadSleepLogData(days);
    loadBrByDateScatterData(days);
}

window.onload = () => {
    updateCharts();  // Initial update to draw all charts based on the default selection
};
