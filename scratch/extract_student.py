import re

def extract_routes():
    file_path = 'c:/Users/lenovo/OneDrive - NSBM/SisuLink/backend/server.js'
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    student_routes = [
        "'/api/student/jobs'",
        "'/api/student/apply'",
        "'/api/student/:studentId/dashboard'",
        "'/api/student/:studentId/attendance-history'",
        "'/api/student/:studentId/academic-report'",
        "'/api/student/profile-by-email/:email'",
        "'/api/student/:studentId/materials'",
        "'/api/student/:email/contacts'"
    ]

    controller_code = "const db = require('../config/db');\n\n"
    routes_code = "const express = require('express');\nconst router = express.Router();\nconst studentController = require('../controllers/studentController');\n\n"

    new_server_lines = []
    i = 0
    extracted_count = 0

    while i < len(lines):
        line = lines[i]
        
        # Check if the line matches any of the student routes
        matched_route = None
        for route in student_routes:
            if f"app.get({route}" in line or f"app.post({route}" in line or f"app.put({route}" in line or f"app.delete({route}" in line:
                matched_route = route
                break
        
        if matched_route:
            extracted_count += 1
            # Determine method and if it has verifyToken
            method = 'get' if 'app.get' in line else 'post' if 'app.post' in line else 'put' if 'app.put' in line else 'delete'
            has_verify = 'verifyToken' in line
            
            # Extract function name from route
            func_name = matched_route.replace('/api/student/', '').replace("'", "").replace(":", "").replace("-", "_").split('/')[0]
            if func_name == "": func_name = "index"
            
            # If there's a param, e.g., studentId/dashboard -> dashboard
            parts = matched_route.replace("'", "").split('/')
            func_name = parts[-1].replace('-', '_')
            if func_name.startswith(':'):
                func_name = 'get' + func_name[1:].capitalize()

            if matched_route == "'/api/student/jobs'": func_name = "getJobs"
            if matched_route == "'/api/student/apply'": func_name = "applyJob"
            if matched_route == "'/api/student/:studentId/dashboard'": func_name = "getDashboard"
            if matched_route == "'/api/student/:studentId/attendance-history'": func_name = "getAttendanceHistory"
            if matched_route == "'/api/student/:studentId/academic-report'": func_name = "getAcademicReport"
            if matched_route == "'/api/student/profile-by-email/:email'": func_name = "getProfileByEmail"
            if matched_route == "'/api/student/:studentId/materials'": func_name = "getMaterials"
            if matched_route == "'/api/student/:email/contacts'": func_name = "getContacts"

            # Create route entry
            clean_route = matched_route.replace("'/api/student", "'")
            route_str = f"router.{method}({clean_route}, "
            # if has_verify:
            #     route_str += "verifyToken, " # Wait, verifyToken is applied globally now. We don't need it.
            
            route_str += f"studentController.{func_name});\n"
            routes_code += route_str

            # Parse the block
            controller_code += f"exports.{func_name} = async (req, res) => {{\n"
            
            # Find the start of the block body
            # `app.get('...', async (req, res) => {`
            body_start_idx = line.find('{')
            if body_start_idx != -1:
                pass # Usually the body starts on the same line
            
            open_braces = line.count('{') - line.count('}')
            
            i += 1
            while open_braces > 0 and i < len(lines):
                controller_code += lines[i]
                open_braces += lines[i].count('{')
                open_braces -= lines[i].count('}')
                i += 1
            
            # Remove the last `});` line and replace it with `};`
            controller_code = controller_code.rstrip()
            if controller_code.endswith('});'):
                controller_code = controller_code[:-3] + '};\n\n'
            elif controller_code.endswith('}'):
                # Sometimes it's just } if it was a weird formatting
                controller_code += '\n\n'

            # Don't add this block to new_server_lines
            continue
            
        new_server_lines.append(line)
        i += 1

    routes_code += "\nmodule.exports = router;\n"

    # Write the files
    with open('c:/Users/lenovo/OneDrive - NSBM/SisuLink/backend/controllers/studentController.js', 'w', encoding='utf-8') as f:
        f.write(controller_code)

    with open('c:/Users/lenovo/OneDrive - NSBM/SisuLink/backend/routes/studentRoutes.js', 'w', encoding='utf-8') as f:
        f.write(routes_code)

    # Insert `app.use('/api/student', studentRoutes);` and require
    final_server_lines = []
    auth_req_added = False
    student_use_added = False
    
    for line in new_server_lines:
        if "const authRoutes = require('./routes/authRoutes');" in line and not auth_req_added:
            final_server_lines.append(line)
            final_server_lines.append("const studentRoutes = require('./routes/studentRoutes');\n")
            auth_req_added = True
        elif "app.use('/api/auth', authRoutes);" in line and not student_use_added:
            final_server_lines.append(line)
            final_server_lines.append("app.use('/api/student', studentRoutes);\n")
            student_use_added = True
        else:
            final_server_lines.append(line)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(final_server_lines)

    print(f"Successfully extracted {extracted_count} student routes.")

if __name__ == '__main__':
    extract_routes()
