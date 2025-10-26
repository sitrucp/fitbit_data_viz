// Centralized getNewData function for all Fitbit Data App pages
function getNewData() {
    const outputElement = document.getElementById('output');
    if (!outputElement) {
        // If no output element, just run the fetch and log to console
        fetch('/run-python').then(response => {
            const reader = response.body.getReader();
            function read() {
                return reader.read().then(({ done, value }) => {
                    if (done) {
                        console.log('Stream completed');
                        return;
                    }
                    const string = new TextDecoder().decode(value);
                    console.log(string); // fallback to console
                    read();
                });
            }
            read();
        }).catch(error => console.error('Error:', error));
        return;
    }
    // If output element exists, stream to it
    outputElement.textContent = '';
    fetch('/run-python').then(response => {
        const reader = response.body.getReader();
        function read() {
            return reader.read().then(({ done, value }) => {
                if (done) {
                    console.log('Stream completed');
                    return;
                }
                const string = new TextDecoder().decode(value);
                outputElement.textContent += string;
                read();
            });
        }
        read();
    }).catch(error => console.error('Error:', error));
}
