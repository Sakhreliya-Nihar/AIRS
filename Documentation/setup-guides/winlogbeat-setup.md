1. Installation

    Download Winlogbeat from the official Elastic webpage: https://www.elastic.co/downloads/beats/winlogbeat

    Extract the contents of the ZIP file into a dedicated folder, ideally C:\Program Files\Winlogbeat.

    Open PowerShell as an Administrator, navigate to that folder, and run the installation script:

    ```PowerShell

    cd 'C:\Program Files\Winlogbeat'
    .\install-service-winlogbeat.ps1

    ```

    (Note: If you get a script execution policy error, run Set-ExecutionPolicy Unrestricted -Scope Process first).

2. Configuration

    Edit the winlogbeat.yml file by removing the Elasticsearch and Kibana content. By default, it assumes data is being sent to an Elastic server, but this pipeline requires the logs to be dropped into a local raw-logs folder as JSON files.

    Delete the setup blocks for Dashboards, Kibana, Elastic Cloud, and Elasticsearch.

    Add the output.file module, which tells Winlogbeat to write out directly to the target directory (raw-logs).

    The output.file module natively writes in NDJSON (Newline Delimited JSON). Every time an event happens, it appends a perfectly formatted JSON string to a new line in winlogbeat-xxxx.ndjson, which the Python script will pick up immediately.

    Add rotate_every_kb and number_of_files to the config. This ensures the raw-logs folder doesn't grow infinitely over time. It will keep a rolling window of the latest 50MB of logs.

3. Validation and Startup

    Once the winlogbeat.yml is saved, test the configuration to ensure there are no YAML formatting errors:
    ```PowerShell

    .\winlogbeat.exe test config -c .\winlogbeat.yml -e

    ```

    If the test passes ("Config OK"), start the background service:

    ```PowerShell

    Start-Service winlogbeat

    Get-Service winlogbeat

    Stop-Service winlogbeat

    ```
