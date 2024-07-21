function updateCharts() {
  loadSleepLogData();
  loadHRByDateData();
  loadSpo2ByDateScatterData();
  loadSpo2ByDateBarData();
  loadHrvByDateAreaData();
  loadHrvByDateScatterData();
  loadBrByDateScatterData();
}

window.onload = () => {
  // Set default dates
  let endDate = new Date();
  let startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  document.getElementById("start").valueAsDate = startDate;
  document.getElementById("end").valueAsDate = endDate;
  updateCharts(); // Initial update to draw all charts based on the default selection
};
