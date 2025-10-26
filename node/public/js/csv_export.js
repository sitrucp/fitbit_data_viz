/**
 * Shared CSV Export Utility
 * Provides reusable CSV export functionality for all chart pages
 */

/**
 * Export data to CSV file
 * @param {Object} config - Configuration object
 * @param {Array} config.data - Array of row objects with data
 * @param {string} config.filename - Name of the CSV file to download
 * @param {Array} config.headers - Array of column header names
 * @param {string} [config.dateColumn] - Name of the date column for sorting (optional)
 * @param {number} [config.decimalPlaces=2] - Number of decimal places for numeric values
 */
function exportToCSV(config) {
    const {
        data,
        filename,
        headers,
        dateColumn = null,
        decimalPlaces = 2
    } = config;

    // Validate required parameters
    if (!data || !Array.isArray(data) || data.length === 0) {
        alert('No data available to export. Please load data first.');
        return;
    }

    if (!filename || !headers || !Array.isArray(headers)) {
        alert('Invalid export configuration. Please contact support.');
        return;
    }

    try {
        // Sort data by date if dateColumn is specified
        let sortedData = [...data];
        if (dateColumn && data[0] && data[0][dateColumn]) {
            sortedData.sort((a, b) => new Date(a[dateColumn]) - new Date(b[dateColumn]));
        }

        // Create CSV content
        let csvContent = headers.join(',') + '\n';

        // Add data rows
        sortedData.forEach(row => {
            const csvRow = headers.map(header => {
                let value = row[header];
                
                // Handle different data types
                if (value === null || value === undefined) {
                    return '0';
                } else if (typeof value === 'number') {
                    return value.toFixed(decimalPlaces);
                } else {
                    // Escape commas in text values
                    return String(value).includes(',') ? `"${value}"` : value;
                }
            });
            csvContent += csvRow.join(',') + '\n';
        });

        // Create and trigger download
        downloadCSV(csvContent, filename);

    } catch (error) {
        console.error('Error creating CSV:', error);
        alert('An error occurred while creating the CSV file. Please try again.');
    }
}

/**
 * Create blob and trigger file download
 * @param {string} csvContent - The CSV content as a string
 * @param {string} filename - The filename for the download
 */
function downloadCSV(csvContent, filename) {
    try {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the URL object
            setTimeout(() => URL.revokeObjectURL(url), 100);
        } else {
            // Fallback for older browsers
            alert('CSV download is not supported in this browser. Please use a modern browser.');
        }
    } catch (error) {
        console.error('Error downloading CSV:', error);
        alert('An error occurred while downloading the file. Please try again.');
    }
}

/**
 * Helper function to transform chart data into row format
 * @param {Object} config - Configuration for data transformation
 * @param {Array} config.dates - Array of date strings
 * @param {Array} config.categories - Array of category names (e.g., HR ranges, sleep stages)
 * @param {Array} config.traces - Chart traces containing the data
 * @returns {Array} Array of row objects suitable for CSV export
 */
function transformChartDataToRows(config) {
    const { dates, categories, traces } = config;
    
    return dates.map(date => {
        const row = { Date: date };
        
        categories.forEach(category => {
            const trace = traces.find(t => t.name === category);
            const dateIndex = dates.indexOf(date);
            row[category] = trace && trace.y ? (trace.y[dateIndex] || 0) : 0;
        });
        
        return row;
    });
}
