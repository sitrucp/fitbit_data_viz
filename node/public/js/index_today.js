  window.onload = () => {
    // Set default start date
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    document.getElementById("start").valueAsDate = startDate;
  
    // Load data on initial load
    loadAllData(startDate.toISOString().split("T")[0]);
  
    // Setup the button click event handler
    document.getElementById("loadDataButton").addEventListener("click", function () {
      const startDate = document.getElementById("start").value;
      loadAllData(startDate); // Load data with new start date
    });
  };


  const formatMinutesToHours = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

async function fetchData(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Network response was not ok");
      return await response.json();
    } catch (error) {
      console.error("Error fetching data:", error);
      return null;
    }
  }

  async function loadAllData(startDate) {
    // Convert input date string to Date object
    const startDateInput = new Date(startDate);
    
    // Calculate end date (same as start date in this case)
    const endDateInput = new Date(startDate);
  
    // Create a new Date object for startDateSeries based on endDateInput
    const startDateSeries = new Date(endDateInput);
    startDateSeries.setDate(endDateInput.getDate() - 90); // Subtract x days
    
    // Format dates to ISO string without time for API calls
    startDate = startDateInput.toISOString().split("T")[0];
    const endDate = endDateInput.toISOString().split("T")[0];
    const startDateSeriesStr = startDateSeries.toISOString().split("T")[0];
  
    const endpoints = {
      hrDaily: `http://localhost:3000/api/hr_daily?start=${startDate}&end=${endDate}`,
      hrZones: `http://localhost:3000/api/hr_zones?start=${startDate}&end=${endDate}`,
      br: `http://localhost:3000/api/br?start=${startDate}&end=${endDate}`,
      spo2Daily: `http://localhost:3000/api/spo2_daily?start=${startDate}&end=${endDate}`,
      hrvDaily: `http://localhost:3000/api/hrv_daily?start=${startDate}&end=${endDate}`,
      sleeplogDaily: `http://localhost:3000/api/sleeplog_daily?start=${startDate}&end=${endDate}`,
      stepsDaily: `http://localhost:3000/api/steps_daily?start=${startDate}&end=${endDate}`,
      vo2max: `http://localhost:3000/api/vo2max?start=${startDate}&end=${endDate}`,
      
      hrSeries: `http://localhost:3000/api/hr_daily?start=${startDateSeriesStr}&end=${endDate}`,
      hrvSeries: `http://localhost:3000/api/hrv_daily?start=${startDateSeriesStr}&end=${endDate}`, 
      stepsSeries: `http://localhost:3000/api/steps_daily?start=${startDateSeriesStr}&end=${endDate}`,
      brSeries: `http://localhost:3000/api/br?start=${startDateSeriesStr}&end=${endDate}`,
      spo2Series: `http://localhost:3000/api/spo2_daily?start=${startDateSeriesStr}&end=${endDate}`,
      sleeplogSeries: `http://localhost:3000/api/sleeplog_daily?start=${startDateSeriesStr}&end=${endDate}`,
      vo2maxSeries: `http://localhost:3000/api/vo2max?start=${startDateSeriesStr}&end=${endDate}`,
      // Add more API endpoints as needed, each with a descriptive key
    };
  
    try {
      // Fetch all data using Promise.all and Object.entries to maintain the association of keys with fetched data
      const data = await Promise.all(
        Object.entries(endpoints).map(([key, url]) =>
          fetchData(url).then((response) => ({ key, data: response }))
        )
      );
  
      // Convert array of results back into an object
      const structuredData = data.reduce((acc, { key, data }) => {
        acc[key] = data;
        return acc;
      }, {});
      
      //console.log(structuredData);

      updatePageContent(structuredData);

    } catch (error) {
      console.error("Error loading all data:", error);
    }
  }

  function createChart(containerId, xData, yData, title, yAxisMin) {
    var chartDom = document.getElementById(containerId);
    var myChart = echarts.init(chartDom);

    // Calculate trend line data
    const trendLineData = calculateTrendLine(yData);

    var option = {
        title: {
            text: title,
            left: 'center',
            top: 10, // Adjusted to give more room between title and plot
            textStyle: {
                fontSize: 12
            }
        },
        tooltip: {
            trigger: 'axis',
            confine: true,
            formatter: function (params) {
                let tooltipText = `${params[0].axisValue}<br/>`;
                params.forEach(param => {
                    tooltipText += `
                        <span style="display:inline-block;margin-right:5px;border-radius:10px;width:9px;height:9px;background-color:${param.color};"></span>
                        ${param.value}<br/>
                    `;
                });
                return tooltipText;
            }
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: xData,
            show: false
        },
        yAxis: {
            type: 'value',
            show: true,
            min: yAxisMin,
            axisLabel: {
                formatter: function (value) {
                    if (value >= 1000) {
                        return (value / 1000) + 'k';
                    }
                    return value;
                },
                textStyle: {
                    fontSize: 12
                }
            }
        },
        series: [
            {
                name: 'Bar Data',
                data: yData,
                type: 'bar',
                smooth: true,
                showSymbol: false,
                itemStyle: {
                    color: 'rgba(0, 128, 128, 0.7)',  // teal
                },
                lineStyle: {
                    width: 1
                }
            },
            {
                name: 'Trend Line',
                data: trendLineData,
                type: 'line',
                smooth: true,
                showSymbol: false,
                lineStyle: {
                    color: "rgba(255, 99, 132, 1)", // pink
                    type: "dashed"
                },
                itemStyle: {
                    color: "rgba(255, 99, 132, 1)" // pink
                }
            }
        ],
        grid: {
            left: '15%',
            right: '5%', // Added to ensure some padding on the right
            bottom: '5%', // Adjusted to ensure some space at the bottom
            top: '25%', // Adjusted for title
            //containLabel: true
        }
    };
    myChart.setOption(option);
}

// Helper function to calculate trend line data
function calculateTrendLine(data) {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    data.forEach((y, i) => {
        const x = i + 1;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
    });
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return data.map((_, i) => {
        const trendValue = slope * (i + 1) + intercept;
        return Math.round(trendValue * 10) / 10; // Round to one decimal point
    });
}

function updatePageContent(data) {
    if (data.hrSeries && data.hrSeries.length > 0) {
      const hrDate = data.hrSeries.map((x) => x.date);
      const hrData = data.hrSeries.map((x) => x.restingHeartRate);
      createChart("heartRateViz", hrDate, hrData, "RHR 90 Days", 50);
    } else {
      console.error("HR series data is unexpected or empty");
    }
  
    if (data.stepsSeries && data.stepsSeries.length > 0) {
        const stepsDate = data.stepsSeries.map((x) => x.date);
        const stepsData = data.stepsSeries.map((x) => x.totalSteps);
        createChart("stepsViz", stepsDate, stepsData, "Steps 90 Days", 0);
      } else {
        console.error("Steps series data is unexpected or empty");
      }

      if (data.hrvSeries && data.hrvSeries.length > 0) {
        const hvrDate = data.hrvSeries.map((x) => x.date);
        const hrvData = data.hrvSeries.map((x) => x.dailyAverageRmssd);
        createChart("hrvViz", hvrDate, hrvData, "Avg HRV 90 Days", 15);
      } else {
        console.error("Hrv series data is unexpected or empty");
      }

      if (data.brSeries && data.brSeries.length > 0) {
        const brDate = data.brSeries.map((x) => x.date);
        const brData = data.brSeries.map((x) => x.fullSleepBr);
        createChart("brViz", brDate, brData, "BR Full Sleep 90 Days", 5);
      } else {
        console.error("BR series data is unexpected or empty");
      }

      if (data.spo2Series && data.spo2Series.length > 0) {
        const spo2Date = data.spo2Series.map((x) => x.date);
        const spo2Data = data.spo2Series.map((x) => x.dailyAvg);
        createChart("spo2Viz", spo2Date, spo2Data, "SpO2 90 Days", 90);
      } else {
        console.error("SpO2 series data is unexpected or empty");
      }

      if (data.vo2maxSeries && data.vo2maxSeries.length > 0) {
        const vo2maxDate = data.vo2maxSeries.map((x) => x.date);
        const vo2maxData = data.vo2maxSeries.map((x) => x.vo2MaxHigh);
        createChart("vo2maxViz", vo2maxDate, vo2maxData, "VO2 Max High 90 Days", 42);
      } else {
        console.error("VO2 Max series data is unexpected or empty");
      }

      if (data.sleeplogSeries && data.sleeplogSeries.length > 0) {
        const sleeplogDate = data.sleeplogSeries.map((x) => x.date);
        const sleeplogData = data.sleeplogSeries.map((x) => parseFloat((x.minutesAsleep / 60).toFixed(1))); // Round to 1 decimal place
        createChart("sleeplogViz", sleeplogDate, sleeplogData, "Hours Asleep 90 Days", 0);
      } else {
        console.error("Sleep series data is unexpected or empty");
      }
      

    // HR
    if (data.hrDaily && data.hrDaily.length > 0) {
      document.getElementById("restingHeartRate").textContent = `Resting Heart Rate: ${data.hrDaily[0].restingHeartRate}`;
      document.getElementById("dailyAverage").textContent = `Average Heart Rate: ${data.hrDaily[0].dailyAverage}`;
      document.getElementById("dailyMax").textContent = `Max Heart Rate: ${data.hrDaily[0].dailyMax}`;
      document.getElementById("dailyMin").textContent = `Min Heart Rate: ${data.hrDaily[0].dailyMin}`;
    }
  
    // Steps
    if (data.stepsDaily && data.stepsDaily.length > 0) {
      document.getElementById("totalSteps").textContent = `Total Steps: ${data.stepsDaily[0].totalSteps}`;
    }
  
    // VO2max
    if (data.vo2max && data.vo2max.length > 0) {
      document.getElementById("vo2MaxHigh").textContent = `VO2max High: ${data.vo2max[0].vo2MaxHigh}`;
      document.getElementById("vo2MaxLow").textContent = `VO2max Low: ${data.vo2max[0].vo2MaxLow}`;
    }
  
    // BR
    if (data.br && data.br.length > 0) {
      document.getElementById("brFull").textContent = `BR Full: ${data.br[0].fullSleepBr}`;
      document.getElementById("brRem").textContent = `BR REM: ${data.br[0].remSleepBr}`;
      document.getElementById("brDeep").textContent = `BR Deep: ${data.br[0].deepSleepBr}`;
      document.getElementById("brLight").textContent = `BR Light: ${data.br[0].lightSleepBr}`;
    }
  
    // SpO2
    if (data.spo2Daily && data.spo2Daily.length > 0) {
      document.getElementById("spo2High").textContent = `SpO2 High: ${data.spo2Daily[0].dailyMax}`;
      document.getElementById("spo2Low").textContent = `SpO2 Low: ${data.spo2Daily[0].dailyMin}`;
      document.getElementById("spo2Avg").textContent = `SpO2 Avg: ${data.spo2Daily[0].dailyAvg}`;
    }

    // sleeplog daily
    if (data.sleeplogDaily && data.sleeplogDaily.length > 0) {
        //document.getElementById("sleepTimeInBed").textContent = `Total: ${formatMinutesToHours(data.sleeplogDaily[0].timeInBed)}`;
        document.getElementById("sleepMinutesAwake").textContent = `Awake: ${formatMinutesToHours(data.sleeplogDaily[0].minutesAwake)}`;
        document.getElementById("sleepMinutesAsleep").textContent = `Asleep: ${formatMinutesToHours(data.sleeplogDaily[0].minutesAsleep)}`;
        //document.getElementById("sleepEfficiency").textContent = `Efficiency: ${data.sleeplogDaily[0].efficiency}`;
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
          };
          const formatDateTime = (dateTime) => new Date(dateTime).toLocaleString('en-US', options).replace('at', '');
          document.getElementById("sleepStartTime").textContent = `Start: ${formatDateTime(data.sleeplogDaily[0].startTime)}`;
          document.getElementById("sleepEndTime").textContent = `End: ${formatDateTime(data.sleeplogDaily[0].endTime)}`;
          
               
      }

    // spo2 chart spo2 by dateTime line visual sparkline
    // TBD  
  
    // HRV
    if (data.hrvDaily && data.hrvDaily.length > 0) {
      document.getElementById("hrvHigh").textContent = `HRV High: ${data.hrvDaily[0].dailyMaxRmssd}`;
      document.getElementById("hrvLow").textContent = `HRV Low: ${data.hrvDaily[0].dailyMinRmssd}`;
      document.getElementById("hrvAvg").textContent = `HRV Avg: ${data.hrvDaily[0].dailyAverageRmssd}`;
    }
    
    // Additional API data can be handled similarly
  }
