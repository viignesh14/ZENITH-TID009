import fitz  # PyMuPDF


def extract_text_from_pdf(file):
    text = ""
    try:
        file.seek(0)
        content = file.read()
        file.seek(0)
        
        # Determine if it's really a PDF or a text/code file
        if content.startswith(b'%PDF'):
            pdf = fitz.open(stream=content, filetype="pdf")
            for page in pdf:
                text += page.get_text()
        else:
            # Fallback for text/source files (test mode)
            text = content.decode('utf-8', errors='ignore')
            
    except Exception as e:
        print(f"Extraction Error: {e}")
        text = "Could not identify content structure. Processing as plain text."

    return text