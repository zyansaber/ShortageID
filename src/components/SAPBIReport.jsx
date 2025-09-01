import React from 'react';

const SAPBIReport = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">SAP BI Report</h3>
        <p className="text-sm text-gray-600 mt-1">Real-time inventory and shortage analytics</p>
      </div>
      <div className="p-2">
        {/* Enlarged iframe for SAP BI Report with correct URL */}
        <iframe
          src="https://app.powerbi.com/view?r=eyJrIjoiNjFkYzliNjMtMTFhNS00ZDJkLWFjOGItNTBiNTdkYjM1ODJlIiwidCI6ImYzMmZmOTZhLTE5ZWEtNGNlOC1iOTExLThiYjk2ODU5MjgzZCJ9"
          className="w-full border-0 rounded-lg"
          style={{ height: '800px', minHeight: '600px' }}
          title="SAP BI Report"
          allowFullScreen
        />
      </div>
    </div>
  );
};

export default SAPBIReport;