import React, { useEffect, useRef, useState, useCallback } from 'react';
import { parseCSV, createHeatmap } from './heatmapUtils';
import './LinkedInHeatmap.css'; // We'll create this CSS file for custom styles

const LinkedInHeatmap = () => {
    const heatmapRef = useRef(null);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [engagementData, setEngagementData] = useState(null);
    const [impressionsData, setImpressionsData] = useState(null);
    const [activeDataset, setActiveDataset] = useState('engagement');
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    const sampleData = [
        { date: new Date("2024-08-29"), url: "https://www.linkedin.com/feed/update/urn:li:activity:7234908681555914754", engagement: 13 },
        { date: new Date("2024-08-20"), url: "https://www.linkedin.com/feed/update/urn:li:activity:7231650937415610368", engagement: 15 },
        { date: new Date("2024-08-08"), url: "https://www.linkedin.com/feed/update/urn:li:activity:7227310839307870210", engagement: 31 },
        { date: new Date("2024-07-31"), url: "https://www.linkedin.com/feed/update/urn:li:activity:7224422809379184640", engagement: 88 },
        { date: new Date("2024-07-24"), url: "https://www.linkedin.com/feed/update/urn:li:activity:7221909246836174849", engagement: 21 },
        // Add more sample data as needed
    ];

    const updateDimensions = useCallback(() => {
        if (heatmapRef.current) {
            setDimensions({
                width: heatmapRef.current.offsetWidth,
                height: heatmapRef.current.offsetHeight
            });
        }
    }, []);

    useEffect(() => {
        setEngagementData(sampleData);
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [updateDimensions]);

    useEffect(() => {
        if (heatmapRef.current && (engagementData || impressionsData) && dimensions.width > 0 && dimensions.height > 0) {
            const data = activeDataset === 'engagement' ? engagementData : impressionsData;
            createHeatmap(data, heatmapRef.current, activeDataset);
        }
    }, [engagementData, impressionsData, activeDataset, dimensions]);

    function handleFileUpload(event, dataType) {
        const file = event.target.files[0];
        if (file) {
            setError(null);
            setMessage(`Processing ${dataType} file...`);
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const csv = e.target.result;
                    const parsedData = parseCSV(csv, dataType);
                    console.log(`Parsed ${dataType} data:`, parsedData);
                    if (parsedData.length === 0) {
                        setError(`No valid data found in the ${dataType} CSV file.`);
                    } else {
                        setMessage(`Loaded ${parsedData.length} posts for ${dataType}.`);
                        if (dataType === 'engagement') {
                            setEngagementData(parsedData);
                        } else {
                            setImpressionsData(parsedData);
                        }
                        setActiveDataset(dataType);
                    }
                } catch (err) {
                    console.error(`Error parsing ${dataType} CSV:`, err);
                    setError(err.message);
                }
            };
            reader.onerror = function(err) {
                console.error("Error reading file:", err);
                setError("Error reading file. Please try again.");
            };
            reader.readAsText(file);
        }
    }

    return (
        <div className="heatmap-container">
            <h1 className="heatmap-title">LinkedIn Post Activity Heatmap</h1>
            <div className="button-group">
                <button className="upload-button" onClick={() => document.getElementById('engagement-input').click()}>
                    Upload Engagement
                </button>
                <button className="upload-button" onClick={() => document.getElementById('impressions-input').click()}>
                    Upload Impressions
                </button>
                <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileUpload(e, 'engagement')}
                    style={{ display: 'none' }}
                    id="engagement-input"
                />
                <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileUpload(e, 'impressions')}
                    style={{ display: 'none' }}
                    id="impressions-input"
                />
            </div>
            <div className="toggle-group">
                <label className={`toggle-label ${activeDataset === 'engagement' ? 'active' : ''}`}>
                    <input
                        type="radio"
                        value="engagement"
                        checked={activeDataset === 'engagement'}
                        onChange={() => setActiveDataset('engagement')}
                        disabled={!engagementData}
                    />
                    Engagement
                </label>
                <label className={`toggle-label ${activeDataset === 'impressions' ? 'active' : ''}`}>
                    <input
                        type="radio"
                        value="impressions"
                        checked={activeDataset === 'impressions'}
                        onChange={() => setActiveDataset('impressions')}
                        disabled={!impressionsData}
                    />
                    Impressions
                </label>
            </div>
            {error && <p className="error-message">{error}</p>}
            {message && <p className="info-message">{message}</p>}
            <div ref={heatmapRef} className="heatmap"></div>
        </div>
    );
};

export default LinkedInHeatmap;