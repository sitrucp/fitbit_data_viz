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

  function changeDateRange(days) {
    const startInput = document.getElementById('start');
    let startDate = new Date(startInput.value);

    startDate.setDate(startDate.getDate() + days);

    startInput.valueAsDate = startDate;

    loadAllData(startDate.toISOString().split("T")[0]);
}

  const formatMinutesToHours = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60 + 0.5).toString();
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
      bpDaily: `http://localhost:3000/api/bp_daily?start=${startDate}&end=${endDate}`,
      br: `http://localhost:3000/api/br?start=${startDate}&end=${endDate}`,
      spo2Daily: `http://localhost:3000/api/spo2_daily?start=${startDate}&end=${endDate}`,
      hrvDaily: `http://localhost:3000/api/hrv_daily?start=${startDate}&end=${endDate}`,
      sleeplogDaily: `http://localhost:3000/api/sleeplog_daily?start=${startDate}&end=${endDate}`,
      sleeplogSummary: `http://localhost:3000/api/sleeplog_summary?start=${startDate}&end=${endDate}`,
      stepsDaily: `http://localhost:3000/api/steps_daily?start=${startDate}&end=${endDate}`,
      stepsHourly: `http://localhost:3000/api/steps_hourly?start=${startDate}&end=${endDate}`,
      vo2max: `http://localhost:3000/api/vo2max?start=${startDate}&end=${endDate}`,
      
      hrSeries: `http://localhost:3000/api/hr_daily?start=${startDateSeriesStr}&end=${endDate}`,
      bpSeries: `http://localhost:3000/api/bp_daily?start=${startDateSeriesStr}&end=${endDate}`,
      hrvSeries: `http://localhost:3000/api/hrv_daily?start=${startDateSeriesStr}&end=${endDate}`, 
      stepsSeries: `http://localhost:3000/api/steps_daily?start=${startDateSeriesStr}&end=${endDate}`,
      stepsHourlySeries: `http://localhost:3000/api/steps_hourly?start=${startDateSeriesStr}&end=${endDate}`,
      brSeries: `http://localhost:3000/api/br?start=${startDateSeriesStr}&end=${endDate}`,
      spo2Series: `http://localhost:3000/api/spo2_daily?start=${startDateSeriesStr}&end=${endDate}`,
      sleeplogSeries: `http://localhost:3000/api/sleeplog_daily?start=${startDateSeriesStr}&end=${endDate}`,
      sleeplogSummarySeries: `http://localhost:3000/api/sleeplog_summary?start=${startDateSeriesStr}&end=${endDate}`,
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
    // Filter out null values and keep track of their indices
    const validData = [];
    const validIndices = [];
    
    data.forEach((value, index) => {
        if (value !== null && value !== undefined && !isNaN(value)) {
            validData.push(value);
            validIndices.push(index);
        }
    });
    
    if (validData.length < 2) {
        // Not enough data points for trend line, return array of nulls
        return data.map(() => null);
    }
    
    const n = validData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    validData.forEach((y, i) => {
        const x = validIndices[i] + 1; // Use original index position
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Generate trend line for all data points (including nulls)
    return data.map((originalValue, i) => {
        if (originalValue === null || originalValue === undefined || isNaN(originalValue)) {
            return null; // Keep nulls as nulls
        }
        const trendValue = slope * (i + 1) + intercept;
        return Math.round(trendValue * 10) / 10; // Round to one decimal point
    });
}

function updatePageContent(data) {
    if (data.hrSeries && data.hrSeries.length > 0) {
      const hrDate = data.hrSeries.map((x) => x.date);
      const hrData = data.hrSeries.map((x) => x.restingHeartRate);
      createChart("heartRateViz", hrDate, hrData, "90 Day RHR", 50);
      // Calculate avgSDailySteps
      const totalRHR = hrData.reduce((acc, curr) => acc + parseFloat(curr || 0), 1);
      const avg90DayRHR = parseFloat((totalRHR / hrData.length).toFixed(0));
      document.getElementById("avg90DayRHR").textContent = `90 Day Avg RHR: ${avg90DayRHR}`;
    } else {
      console.error("HR series data is unexpected or empty");
    }

    //console.log("BP Series raw data:", data.bpSeries);
    if (data.bpSeries && data.bpSeries.length > 0) {
      // Filter blood pressure data to only include pharmacy device readings
      const pharmacyBpData = data.bpSeries.filter(x => x.device === "pharmacy");
      //console.log("Filtered pharmacy BP series data:", pharmacyBpData);
      
      if (pharmacyBpData.length > 0) {
        // Generate full 90-day date range
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 90);
        
        const fullDateRange = [];
        for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
          fullDateRange.push(d.toISOString().substring(0, 10));
        }
        
        //console.log("Full 90-day date range:", fullDateRange.length, "days");
        //console.log("Available BP data days:", pharmacyBpData.length, "days");
        
        // Map BP data to full date range, filling gaps with null
        const systolicDataFull = fullDateRange.map(date => {
          const dataPoint = pharmacyBpData.find(x => x.date === date);
          return dataPoint ? parseFloat(dataPoint.systolic.avg || 0) : null;
        });
        
        const diastolicDataFull = fullDateRange.map(date => {
          const dataPoint = pharmacyBpData.find(x => x.date === date);
          return dataPoint ? parseFloat(dataPoint.diastolic.avg || 0) : null;
        });
        
        //console.log("Systolic data with gaps:", systolicDataFull.filter(x => x !== null).length, "non-null values");
        //console.log("Diastolic data with gaps:", diastolicDataFull.filter(x => x !== null).length, "non-null values");
        
        // Systolic Blood Pressure Chart
        createChart("systolicViz", fullDateRange, systolicDataFull, "90 Day Systolic BP", 90);
        const totalSystolic = systolicDataFull.filter(x => x !== null).reduce((acc, curr) => acc + curr, 0);
        const validSystolicDays = systolicDataFull.filter(x => x !== null).length;
        const avg90DaySystolic = validSystolicDays > 0 ? parseFloat((totalSystolic / validSystolicDays).toFixed(1)) : 0;
        document.getElementById("avg90DaySystolic").textContent = `90 Day Avg Systolic: ${avg90DaySystolic}`;
        
        // Diastolic Blood Pressure Chart
        createChart("diastolicViz", fullDateRange, diastolicDataFull, "90 Day Diastolic BP", 60);
        const totalDiastolic = diastolicDataFull.filter(x => x !== null).reduce((acc, curr) => acc + curr, 0);
        const validDiastolicDays = diastolicDataFull.filter(x => x !== null).length;
        const avg90DayDiastolic = validDiastolicDays > 0 ? parseFloat((totalDiastolic / validDiastolicDays).toFixed(1)) : 0;
        document.getElementById("avg90DayDiastolic").textContent = `90 Day Avg Diastolic: ${avg90DayDiastolic}`;
      } else {
        console.log("No pharmacy blood pressure data available for charts. Available devices:", data.bpSeries.map(x => x.device));
      }
    } else {
      console.error("BP series data is unexpected or empty");
    }
  
    if (data.stepsSeries && data.stepsSeries.length > 0) {
        const stepsDate = data.stepsSeries.map((x) => x.date);
        const stepsData = data.stepsSeries.map((x) => x.totalSteps);
        createChart("stepsViz", stepsDate, stepsData, "90 Day Steps", 0);
        // Calculate avgSDailySteps
        const totalSteps = stepsData.reduce((acc, curr) => acc + parseFloat(curr || 0), 0);
          const avgSDailySteps = parseFloat((totalSteps / data.stepsSeries.length).toFixed(0));
        document.getElementById("avgSDailySteps").textContent = `90 Day Avg Steps: ${avgSDailySteps}`;
      } else {
        console.error("Steps series data is unexpected or empty");
      }

      if (data.stepsHourlySeries && data.stepsHourlySeries.length > 0) {
        //console.log('Steps Hourly Series', data.stepsHourlySeries);
        // Reduce data to one record per date (using first hour's value)
        const stepsByDate = data.stepsHourlySeries.reduce((acc, curr) => {
            const date = curr.date;
            // Check if date is valid and not null before adding
            if (date) {
              if (!acc[date]) {
                acc[date] = curr;
              }
            }
            return acc;
          }, {});
        // Extract dates and hourGt250Steps from reduced data
        //const steps250Date = Object.keys(stepsByDate);
        const steps250Date = Object.values(stepsByDate).map(x => x.date);
        const steps250Data = Object.values(stepsByDate).map(x => x.hourGt250Steps);
        createChart("hours250StepsViz", steps250Date, steps250Data, "90 Day Hours > 250 Steps", 0);
        // Calculate avgSteps250Data
        const totalSteps = steps250Data.reduce((acc, curr) => acc + parseFloat(curr || 0), 0);
        const avgSteps250Data = parseFloat((totalSteps / steps250Data.length).toFixed(1));
        document.getElementById("avgHours250Steps").textContent = `90 Day Avg Hours > 250 Steps: ${avgSteps250Data}`;
      } else {
        console.error("Steps hourly series data is unexpected or empty");
      }

      if (data.hrvSeries && data.hrvSeries.length > 0) {
        const hvrDate = data.hrvSeries.map((x) => x.date);
        const hrvData = data.hrvSeries.map((x) => x.dailyAverageRmssd);
        createChart("hrvViz", hvrDate, hrvData, "90 Day Avg HRV", 15);
        // Calculate avg90DayHRV
        const totalHRV = hrvData.reduce((acc, curr) => acc + parseFloat(curr || 0), 0);
        const avg90DayHRV = parseFloat((totalHRV / hrvData.length).toFixed(1));
        document.getElementById("avg90DayHRV").textContent = `90 Day Avg HRV: ${avg90DayHRV}`;
      } else {
        console.error("Hrv series data is unexpected or empty");
      }

      if (data.brSeries && data.brSeries.length > 0) {
        const brDate = data.brSeries.map((x) => x.date);
        const brData = data.brSeries.map((x) => x.fullSleepBr);
        createChart("brViz", brDate, brData, "90 Day BR Full Sleep", 5);
        // Calculate avg90DayFullSleepBr
        const totalFullSleepBr = brData.reduce((acc, curr) => acc + parseFloat(curr || 0), 0);
        const avg90DayFullSleepBr = parseFloat((totalFullSleepBr / brData.length).toFixed(1));
        document.getElementById("avg90DayFullSleepBr").textContent = `90 Day BR Full: ${avg90DayFullSleepBr}`;
      } else {
        console.error("BR series data is unexpected or empty");
      }

      if (data.spo2Series && data.spo2Series.length > 0) {
        //console.log(data.spo2Series);
        const spo2Date = data.spo2Series.map((x) => x.date);
        const spo2Data = data.spo2Series.map((x) => x.dailyAvg);
        createChart("spo2Viz", spo2Date, spo2Data, "90 Day SpO2", 90);
        // Calculate avg90DaySpO2
        const totalSpO2 = spo2Data.reduce((acc, curr) => acc + parseFloat(curr || 0), 0);
        const avg90DaySpO2 = parseFloat((totalSpO2 / spo2Data.length).toFixed(1));
        document.getElementById("avg90DaySpO2").textContent = `90 Day Avg SpO2: ${avg90DaySpO2}`;
      } else {
        console.error("SpO2 series data is unexpected or empty");
      }

      if (data.vo2maxSeries && data.vo2maxSeries.length > 0) {
        const vo2maxDate = data.vo2maxSeries.map((x) => x.date);
        const vo2maxData = data.vo2maxSeries.map((x) => x.vo2MaxHigh);
        createChart("vo2maxViz", vo2maxDate, vo2maxData, "90 Day VO2 Max High", 42);
      } else {
        console.error("VO2 Max series data is unexpected or empty");
      }

      if (data.sleeplogSeries && data.sleeplogSeries.length > 0) {
        const sleeplogDate = data.sleeplogSeries.map((x) => x.date);
        const sleeplogData = data.sleeplogSeries.map((x) => parseFloat((x.minutesAsleep / 60).toFixed(1))); 
        createChart("sleeplogViz", sleeplogDate, sleeplogData, "90 Day Sleep Time (Hours)", 0);
        // Calculate avg90DayminutesAsleep
        const totalAsleep = sleeplogData.reduce((acc, curr) => acc + parseFloat(curr || 0), 1);
        const avgMinutesAsleep = parseFloat(((totalAsleep * 60) / sleeplogData.length).toFixed(1));
        document.getElementById("avg90DayMinutesAsleep").textContent = `90 Day Avg Asleep: ${formatMinutesToHours(avgMinutesAsleep)}`;
      } else {
        console.error("Sleep series data is unexpected or empty");
      }

      if (data.sleeplogSeries && data.sleeplogSeries.length > 0) {
        // Sleep efficiency verification is no longer needed since we're using our own calculation
        console.log("Using calculated sleep efficiency: (minutesAsleep / timeInBed) * 100");
        console.log(`Total sleep records processed: ${data.sleeplogSeries.length}`);
        
        const sleepEfficiencyDate = data.sleeplogSeries.map((x) => x.date);
        // Use our own calculation: (minutesAsleep / timeInBed) * 100
        const sleepEfficiencyData = data.sleeplogSeries.map((x) => {
          return x.timeInBed > 0 ? parseFloat(((x.minutesAsleep / x.timeInBed) * 100).toFixed(1)) : 0;
        }); 
        createChart("sleepEfficiencyViz", sleepEfficiencyDate, sleepEfficiencyData, "90 Day Sleep Efficiency % (Calculated)", 70);
        // Calculate avg90DaySleepEfficiency using our calculation
        const totalEfficiency = sleepEfficiencyData.reduce((acc, curr) => acc + parseFloat(curr || 0), 0);
        const avg90DaySleepEfficiency = parseFloat((totalEfficiency / sleepEfficiencyData.length).toFixed(1));
        document.getElementById("avg90DaySleepEfficiency").textContent = `90 Day Avg Efficiency: ${avg90DaySleepEfficiency}%`;

        // Total Awake Chart (using minutesAwake from sleeplogSeries)
        const totalAwakeData = data.sleeplogSeries.map((x) => parseFloat((x.minutesAwake || 0) / 60));
        createChart("totalAwakeViz", sleepEfficiencyDate, totalAwakeData, "90 Day Awake Time (Hours)", 0);
        const totalAwakeSum = totalAwakeData.reduce((acc, curr) => acc + parseFloat(curr || 0), 0);
        const avg90DayTotalAwake = parseFloat((totalAwakeSum / totalAwakeData.length).toFixed(1));
        document.getElementById("avg90DayTotalAwake").textContent = `90 Day Avg Awake: ${avg90DayTotalAwake}h`;

        // Total Time in Bed Chart
        const totalTimeInBedData = data.sleeplogSeries.map((x) => parseFloat((x.timeInBed || 0) / 60));
        createChart("totalTimeInBedViz", sleepEfficiencyDate, totalTimeInBedData, "90 Day Time in Bed (Hours)", 6);
        const totalTimeInBedSum = totalTimeInBedData.reduce((acc, curr) => acc + parseFloat(curr || 0), 0);
        const avg90DayTimeInBed = parseFloat((totalTimeInBedSum / totalTimeInBedData.length).toFixed(1));
        document.getElementById("avg90DayTimeInBed").textContent = `90 Day Avg Time in Bed: ${avg90DayTimeInBed}h`;
      } else {
        console.error("Sleep efficiency series data is unexpected or empty");
      }

      // Sleep Stage Charts
      if (data.sleeplogSummarySeries && data.sleeplogSummarySeries.length > 0) {
        const sleepStageDate = data.sleeplogSummarySeries.map((x) => x.date);
        
        // REM Sleep Chart
        const remData = data.sleeplogSummarySeries.map((x) => parseFloat((x.minutesRem || 0) / 60)); 
        createChart("remSleepViz", sleepStageDate, remData, "90 Day REM Sleep (Hours)", 0);
        const totalRem = remData.reduce((acc, curr) => acc + parseFloat(curr || 0), 0);
        const avgRem = parseFloat((totalRem / remData.length).toFixed(1));
        document.getElementById("avg90DayRem").textContent = `90 Day Avg REM: ${avgRem}h`;
        
        // Deep Sleep Chart
        const deepData = data.sleeplogSummarySeries.map((x) => parseFloat((x.minutesDeep || 0) / 60)); 
        createChart("deepSleepViz", sleepStageDate, deepData, "90 Day Deep Sleep (Hours)", 0);
        const totalDeep = deepData.reduce((acc, curr) => acc + parseFloat(curr || 0), 0);
        const avgDeep = parseFloat((totalDeep / deepData.length).toFixed(1));
        document.getElementById("avg90DayDeep").textContent = `90 Day Avg Deep: ${avgDeep}h`;
        
        // Light Sleep Chart
        const lightData = data.sleeplogSummarySeries.map((x) => parseFloat((x.minutesLight || 0) / 60)); 
        createChart("lightSleepViz", sleepStageDate, lightData, "90 Day Light Sleep (Hours)", 0);
        const totalLight = lightData.reduce((acc, curr) => acc + parseFloat(curr || 0), 0);
        const avgLight = parseFloat((totalLight / lightData.length).toFixed(1));
        document.getElementById("avg90DayLight").textContent = `90 Day Avg Light: ${avgLight}h`;
        

      } else {
        console.error("Sleep summary series data is unexpected or empty");
      }
      

    // HR
    if (data.hrDaily && data.hrDaily.length > 0) {
      document.getElementById("restingHeartRate").textContent = `Resting Heart Rate: ${data.hrDaily[0].restingHeartRate}`;
      document.getElementById("dailyAverage").textContent = `Average Heart Rate: ${data.hrDaily[0].dailyAverage}`;
      document.getElementById("dailyMax").textContent = `Max Heart Rate: ${data.hrDaily[0].dailyMax}`;
      document.getElementById("dailyMin").textContent = `Min Heart Rate: ${data.hrDaily[0].dailyMin}`;
    }

    // Blood Pressure - Use most recent reading from series data
    //console.log("BP Series raw data:", data.bpSeries);
    if (data.bpSeries && data.bpSeries.length > 0) {
      // Filter blood pressure data to only include pharmacy device readings
      const pharmacyBpSeries = data.bpSeries.filter(x => x.device === "pharmacy");
      //console.log("Filtered pharmacy BP series data:", pharmacyBpSeries);
      
      if (pharmacyBpSeries.length > 0) {
        // Sort by date to get most recent reading (series data should already be sorted)
        const mostRecentBp = pharmacyBpSeries[pharmacyBpSeries.length - 1];
        //console.log("Most recent pharmacy BP data:", mostRecentBp);
        
        // Most Recent Blood Pressure Values
        document.getElementById("systolicToday").textContent = `Systolic: ${mostRecentBp.systolic.avg}`;
        document.getElementById("diastolicToday").textContent = `Diastolic: ${mostRecentBp.diastolic.avg}`;
        
        // Most Recent Day's Min/Max
        document.getElementById("systolicMin").textContent = `Systolic Min: ${mostRecentBp.systolic.min}`;
        document.getElementById("systolicMax").textContent = `Systolic Max: ${mostRecentBp.systolic.max}`;
        document.getElementById("diastolicMin").textContent = `Diastolic Min: ${mostRecentBp.diastolic.min}`;
        document.getElementById("diastolicMax").textContent = `Diastolic Max: ${mostRecentBp.diastolic.max}`;
      } else {
        console.log("No pharmacy BP data found in series. Available devices:", data.bpSeries.map(x => x.device));
        // No pharmacy data available
        document.getElementById("systolicToday").textContent = `Systolic: N/A`;
        document.getElementById("diastolicToday").textContent = `Diastolic: N/A`;
        document.getElementById("systolicMin").textContent = `Systolic Min: N/A`;
        document.getElementById("systolicMax").textContent = `Systolic Max: N/A`;
        document.getElementById("diastolicMin").textContent = `Diastolic Min: N/A`;
        document.getElementById("diastolicMax").textContent = `Diastolic Max: N/A`;
      }
    } else {
      console.log("No BP series data available at all");
      // No BP data available
      document.getElementById("systolicToday").textContent = `Systolic: N/A`;
      document.getElementById("diastolicToday").textContent = `Diastolic: N/A`;
      document.getElementById("systolicMin").textContent = `Systolic Min: N/A`;
      document.getElementById("systolicMax").textContent = `Systolic Max: N/A`;
      document.getElementById("diastolicMin").textContent = `Diastolic Min: N/A`;
      document.getElementById("diastolicMax").textContent = `Diastolic Max: N/A`;
    }
  
    // Steps Daily
    if (data.stepsDaily && data.stepsDaily.length > 0) {
        document.getElementById("totalSteps").textContent = `Total Steps: ${data.stepsDaily[0].totalSteps}`;
    }
  
    // Steps Hourly
    if (data.stepsHourly && data.stepsHourly.length > 0) {
        // count hours that have steps count > 249 steps
        let count = 0;
        for (let i = 0; i < data.stepsHourly.length; i++) {
          if (data.stepsHourly[i].steps > 249) {
            count++;
          }
        }
        document.getElementById("hours250Steps").textContent = `# Hours > 250 Steps: ${count}`;
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

    // Sleep Efficiency
    if (data.sleeplogDaily && data.sleeplogDaily.length > 0) {
        // Calculate our own efficiency: (minutesAsleep / timeInBed) * 100
        const calculatedEfficiency = data.sleeplogDaily[0].timeInBed > 0 ? 
          Math.round((data.sleeplogDaily[0].minutesAsleep / data.sleeplogDaily[0].timeInBed) * 100) : 0;
        document.getElementById("sleepEfficiency").textContent = `Sleep Efficiency: ${calculatedEfficiency}%`;
        document.getElementById("timeInBed").textContent = `Time in Bed: ${formatMinutesToHours(data.sleeplogDaily[0].timeInBed)}`;

        // Total Awake Data
        const totalAwakeMinutes = data.sleeplogDaily[0].minutesAwake || 0;
        const totalTimeInBedMinutes = data.sleeplogDaily[0].timeInBed || 0;
        const awakePercentageOfBed = totalTimeInBedMinutes > 0 ? ((totalAwakeMinutes / totalTimeInBedMinutes) * 100).toFixed(1) : 0;
        
        document.getElementById("totalAwakeMinutes").textContent = `Awake Minutes: ${totalAwakeMinutes}`;
        document.getElementById("totalAwakeHours").textContent = `Awake Time: ${formatMinutesToHours(totalAwakeMinutes)}`;
        document.getElementById("totalAwakePercentage").textContent = `Awake %: ${awakePercentageOfBed}%`;

        // Total Time in Bed Data
        const targetSleep = 8 * 60; // 8 hours in minutes
        const bedTimeVsTarget = totalTimeInBedMinutes - targetSleep;
        const bedTimeTargetText = bedTimeVsTarget >= 0 ? `+${formatMinutesToHours(bedTimeVsTarget)}` : `${formatMinutesToHours(bedTimeVsTarget)}`;
        
        document.getElementById("totalTimeInBedMinutes").textContent = `Bed Minutes: ${totalTimeInBedMinutes}`;
        document.getElementById("totalTimeInBedHours").textContent = `Bed Time: ${formatMinutesToHours(totalTimeInBedMinutes)}`;
    }

    if (data.sleeplogSummary && data.sleeplogSummary.length > 0) {
        // Calculate custom sleep efficiency from sleep stages
        const summary = data.sleeplogSummary[0];
        const totalSleepMinutes = (summary.minutesDeep || 0) + (summary.minutesLight || 0) + (summary.minutesRem || 0);
        const totalTimeInBed = totalSleepMinutes + (summary.minutesAwake || 0);
        const customEfficiency = totalTimeInBed > 0 ? ((totalSleepMinutes / totalTimeInBed) * 100).toFixed(1) : 0;

        document.getElementById("totalSleepMinutes").textContent = `Total Sleep: ${formatMinutesToHours(totalSleepMinutes)}`;

        // REM Sleep Stage Data
        const remMinutes = summary.minutesRem || 0;
        const remPercentage = totalSleepMinutes > 0 ? ((remMinutes / totalSleepMinutes) * 100).toFixed(1) : 0;
        document.getElementById("remMinutes").textContent = `REM Minutes: ${remMinutes}`;
        document.getElementById("remPercentage").textContent = `REM %: ${remPercentage}%`;
        document.getElementById("remHours").textContent = `REM Time: ${formatMinutesToHours(remMinutes)}`;

        // Deep Sleep Stage Data
        const deepMinutes = summary.minutesDeep || 0;
        const deepPercentage = totalSleepMinutes > 0 ? ((deepMinutes / totalSleepMinutes) * 100).toFixed(1) : 0;
        document.getElementById("deepMinutes").textContent = `Deep Minutes: ${deepMinutes}`;
        document.getElementById("deepPercentage").textContent = `Deep %: ${deepPercentage}%`;
        document.getElementById("deepHours").textContent = `Deep Time: ${formatMinutesToHours(deepMinutes)}`;

        // Light Sleep Stage Data
        const lightMinutes = summary.minutesLight || 0;
        const lightPercentage = totalSleepMinutes > 0 ? ((lightMinutes / totalSleepMinutes) * 100).toFixed(1) : 0;
        document.getElementById("lightMinutes").textContent = `Light Minutes: ${lightMinutes}`;
        document.getElementById("lightPercentage").textContent = `Light %: ${lightPercentage}%`;
        document.getElementById("lightHours").textContent = `Light Time: ${formatMinutesToHours(lightMinutes)}`;

        // Awake Time Data
        const awakeMinutes = summary.minutesAwake || 0;
        const awakePercentage = totalTimeInBed > 0 ? ((awakeMinutes / totalTimeInBed) * 100).toFixed(1) : 0;
        document.getElementById("totalAwakeMinutes").textContent = `Awake Minutes: ${awakeMinutes}`;
        document.getElementById("totalAwakePercentage").textContent = `Awake %: ${awakePercentage}%`;
        document.getElementById("totalAwakeHours").textContent = `Awake Time: ${formatMinutesToHours(awakeMinutes)}`;
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
