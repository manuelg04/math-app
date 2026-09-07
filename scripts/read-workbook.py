import json
import sys
import zipfile
import xml.etree.ElementTree as ET

ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(sys.argv[1]) as archive:
    strings = []
    if 'xl/sharedStrings.xml' in archive.namelist():
        strings = [''.join(item.itertext()) for item in ET.fromstring(archive.read('xl/sharedStrings.xml'))]
    relationships = {r.attrib['Id']: r.attrib['Target'] for r in ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))}
    result = {}
    for sheet in ET.fromstring(archive.read('xl/workbook.xml')).find('m:sheets', ns):
        target = relationships[sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
        target = target.lstrip('/') if target.startswith('/') else 'xl/' + target
        rows = []
        width = 0
        for row in ET.fromstring(archive.read(target)).find('m:sheetData', ns):
            values = {}
            for cell in row:
                letters = ''.join(c for c in cell.attrib['r'] if c.isalpha())
                index = 0
                for letter in letters:
                    index = index * 26 + ord(letter) - 64
                width = max(width, index)
                value = cell.find('m:v', ns)
                if cell.attrib.get('t') == 'inlineStr':
                    text = cell.find('m:is', ns)
                    values[index - 1] = ''.join(text.itertext()) if text is not None else None
                elif value is not None and value.text is not None:
                    text = value.text
                    values[index - 1] = strings[int(text)] if cell.attrib.get('t') == 's' else float(text) if cell.attrib.get('t') != 'str' else text
            rows.append(values)
        headers = []
        empty = 0
        for index in range(width):
            value = rows[0].get(index)
            if value is None:
                value = '__EMPTY' + ('_' + str(empty) if empty else '')
                empty += 1
            headers.append(str(value))
        result[sheet.attrib['name']] = [{headers[index]: row.get(index) for index in range(width)} for row in rows[1:] if row]
    print(json.dumps(result, ensure_ascii=False))
