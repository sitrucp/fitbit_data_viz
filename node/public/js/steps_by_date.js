// Flag to indicate first load
let isFirstLoadSteps = true;

function loadStepsByDateBarData() {
    let startDate, endDate;
    if (isFirstLoadSteps) {
        // Default dates for the first load
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 365); // Set start x days earlier than today
        startDate = startDate.toISOString().split('T')[0];
        endDate = endDate.toISOString().split('T')[0];
        isFirstLoadSteps = false;
    } else {
        // Get dates from the input fields after the first load
        startDate = document.getElementById("start").value;
        endDate = document.getElementById("end").value;
    }

    // Fetch data from your API
    fetch(`http://localhost:3000/api/steps?start=${startDate}&end=${endDate}`)
        .then(response => response.json())
        .then(data => {
            const dates = data.map(item => new Date(item.dateTime));
            const steps = data.map(item => item.steps);
            const cumulativeSteps = steps.map((sum => value => sum += value)(0));  // Cumulative sum

            // Prepare traces for the Plotly chart
            const traceSteps = {
                x: dates,
                y: steps,
                type: 'bar',
                name: 'Hourly Steps',
                marker: {
                    color: '#008080'  // Teal for steps
                }
            };

            const traceCumulativeSteps = {
                x: dates,
                y: cumulativeSteps,
                type: 'scatter',
                mode: 'lines+markers',
                name: 'Cumulative Steps',
                line: {
                    color: '#FCBF49'  // Orange for cumulative steps
                }
            };

            const layout = {
                title: 'Steps By Date',
                xaxis: {
                    title: 'Date',
                    type: 'date',
                    tickformat: '%Y-%m-%d %H:%M',
                },
                yaxis: {
                    title: 'Steps'
                },
                legend: {
                    orientation: 'h',
                    x: 0,
                    y: 1.1
                },
                shapes: [
                    {
                        type: 'line',
                        xref: 'paper',
                        x0: 0,
                        y0: 10000,
                        x1: 1,
                        y1: 10000,
                        line: {
                            color: '#FF5151',
                            width: 2,
                            dash: 'dashdot'
                        }
                    }
                ]
            };

            Plotly.newPlot('steps_by_date_bar', [traceSteps, traceCumulativeSteps], layout);
        })
        .catch(error => console.error('Error loading data:', error));
}
