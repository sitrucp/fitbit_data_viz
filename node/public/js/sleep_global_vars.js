// Global variables for chart date ranges
let globalSleepChartStartTime;
let globalSleepChartEndTime;

// Function to set global chart date range
function setGlobalSleepChartDateRange(startTime, endTime) {
    globalSleepChartStartTime = startTime;
    globalSleepChartEndTime = endTime;
}

// Function to get global chart date range
function getGlobalSleepChartDateRange() {
    return {
        sleepChartStartTime: globalSleepChartStartTime,
        sleepChartEndTime: globalSleepChartEndTime
    };
}

// Function to adjust date range by adding/subtracting minutes
function adjustDateRange(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
}