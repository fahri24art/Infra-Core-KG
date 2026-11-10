import pandas as pd

file_path = "f:\\TCF Project Infra\\APP_Power_Asset\\TCFSG-SOP-ICT-03 Prosedur Permintaan Fasilitas ICT.xlsx"

try:
    df = pd.read_excel(file_path, sheet_name='Isi after')
    print("=== SHEET: Isi after ===")
    print(df.to_string())
except Exception as e:
    print(f"Error reading with pandas: {e}")
    try:
        import openpyxl
        wb = openpyxl.load_workbook(file_path, data_only=True)
        sheet = wb['Isi after']
        for row in sheet.iter_rows(values_only=True):
            print(row)
    except Exception as e2:
        print(f"Error reading with openpyxl: {e2}")
