// Mock data structure based on shortageID fields for development and fallback
export const mockShortageData = [
  {
    id: "P001",
    PartCode: "P001",
    Material_Description: "Steel Bracket Assembly",
    Source_Flag: "Kanban",
    Kanban_ID: "KB001",
    Min_Containers: 2,
    Max_Containers: 10,
    Qty_per_Container: 50,
    Stock_LG0001: 45,
    Open_PO_Qty: 200,
    Safety_Stock: 100,
    Lead_Time_Days: 14,
    Avg_Min_Cover_Days: 7,
    Recent_3M_Issue_Qty: 1500,
    Daily_Usage_Avg: 16.7,
    Days_Covered: 2.7,
    Total_Value: 2250.00,
    Standard_Price: 50.00,
    Supplier_Code: "SUP001",
    Supplier_Name: "Longtree Supplier",
    Shortage_Reason: "Min stock design issue"
  },
  {
    id: "P002",
    PartCode: "P002",
    Material_Description: "Hydraulic Pump Component",
    Source_Flag: "BoM",
    Stock_LG0001: 15,
    Open_PO_Qty: 0,
    Recent_3M_Issue_Qty: 300,
    Next_Open_PO_Date: "2025-09-15",
    First_Overdue_PO_Date: "2025-08-20",
    Requisition_Without_PO: true,
    Requisition_Without_PO_Open_Qty: 50,
    PR_Next_Due_Date: "2025-09-01",
    PR_First_Overdue_Date: "2025-08-25",
    Supplier_Name: "New Gonow",
    Shortage_Reason: "Requisition without PO"
  },
  {
    id: "P003",
    PartCode: "P003",
    Material_Description: "Electronic Control Module",
    Source_Flag: "Longtree",
    Safety_Stock: 25,
    Stock_LG0001: 8,
    Open_PO_Qty: 100,
    Supplier_Name: "Longtree Supplier",
    Shortage_Reason: "Spare Parts (Longtree)"
  },
  {
    id: "P004",
    PartCode: "P004",
    Material_Description: "Custom Gasket Set",
    Source_Flag: "Other",
    Supplier_Name: "Local Supplier",
    Stock_LG0001: 5,
    Open_PO_Qty: 0,
    Lead_Time_Days: 21,
    Shortage_Reason: "No Requirement"
  },
  {
    id: "NEW001",
    PartCode: "",
    Material_Description: "",
    Source_Flag: "None",
    Supplier_Name: "",
    Stock_LG0001: 0,
    Open_PO_Qty: 0,
    Shortage_Reason: "No part code"
  }
];

// Shortage reasons with corresponding required actions
export const shortageReasons = [
  "Spare Parts (Longtree)",
  "No Requirement", 
  "No part code",
  "Inaccurate Stock level",
  "Open Order issue",
  "Requisition without PO",
  "MRP system issue",
  "Min stock design issue",
  "Lead days too long",
  "Investigate"
];

// Required actions mapping based on shortage reasons
export const requiredActionsByReason = {
  "Spare Parts (Longtree)": ["Spare parts MIN/MRP confirmation"],
  "No Requirement": ["Add into BoM or Kanban"],
  "No part code": ["Add Part code"],
  "Lead days too long": ["Change the Lead days"]
};

// Assignment options
export const assignmentOptions = [
  "Design",
  "Planning", 
  "Purchasing",
  "Store"
];

// Transport options
export const transportOptions = [
  "airfreight",
  "seafreight",
  "local supplier"
];