function updateCharts() {
    loadSleepLogData();
    loadHRByDateData();
    loadSpo2ByDateScatterData();
    loadSpo2ByDateBarData();
    loadHrvByDateAreaData();
    loadHrvByDateScatterData();
    loadBrByDateScatterData();
  }
  
  document.addEventListener('DOMContentLoaded', function() {
    // Set default date to today
    let today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startDateInput = document.getElementById("start");
    if (startDateInput) {
      startDateInput.valueAsDate = today;
    }
    
    updateCharts(); // Initial update to draw all charts based on the default selection
  });