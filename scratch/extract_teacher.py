import re
import os

def extract_routes():
    file_path = 'c:/Users/lenovo/OneDrive - NSBM/SisuLink/backend/server.js'
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    teacher_routes = [
        "'/api/teacher/:email/dashboard'",
        "'/api/teacher/:email/events'",
        "'/api/teacher/:email/timetable'",
        "'/api/teacher/:email/students'",
        "'/api/teacher/:email/class-students'",
        "'/api/teacher/attendance'",
        "'/api/teacher/profile/:email'",
        "'/api/teacher/upload-avatar'",
        "'/api/teacher/remove-avatar'",
        "'/api/teacher/upload-material'",
        "'/api/teacher/:email/materials'",
        "'/api/teacher/:email/contacts'",
        "'/api/teacher/:email/attendance-history'",
        "'/api/teacher/:email/attendance-monthly-report/:year/:month'",
        "'/api/teacher/:email/assignments'",
        "'/api/teacher/:email/class-marks'"
    ]

    controller_code = "const db = require('../config/db');\nconst { createClient } = require('@supabase/supabase-js');\nconst supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);\n\n"
    routes_code = "const express = require('express');\nconst router = express.Router();\nconst teacherController = require('../controllers/teacherController');\nconst multer = require('multer');\nconst upload = multer({ storage: multer.memoryStorage() });\n\n"

    new_server_lines = []
    i = 0
    extracted_count = 0
    seen_routes = {}

    while i < len(lines):
        line = lines[i]
        
        # Check if the line matches any of the teacher routes
        matched_route = None
        for route in teacher_routes:
            if f"app.get({route}" in line or f"app.post({route}" in line or f"app.put({route}" in line or f"app.delete({route}" in line:
                matched_route = route
                break
        
        # Make sure we don't grab one-liners that don't have a body (like the ones already routed)
        if matched_route and "async (req, res)" in line:
            extracted_count += 1
            method = 'get' if 'app.get' in line else 'post' if 'app.post' in line else 'put' if 'app.put' in line else 'delete'
            has_upload_single_photo = "upload.single('photo')" in line
            has_upload_single_file = "upload.single('file')" in line
            
            # Extract function name from route
            clean_route = matched_route.replace("'/api/teacher", "'")
            
            # Simple naming logic based on route and method
            route_key = method + ":" + matched_route
            if route_key not in seen_routes:
                if matched_route == "'/api/teacher/:email/dashboard'": func_name = "getDashboard"
                elif matched_route == "'/api/teacher/:email/events'": func_name = "getEvents"
                elif matched_route == "'/api/teacher/:email/timetable'": func_name = "getTimetable"
                elif matched_route == "'/api/teacher/:email/students'": func_name = "getStudents"
                elif matched_route == "'/api/teacher/:email/class-students'": func_name = "getClassStudents"
                elif matched_route == "'/api/teacher/attendance'" and method == "post": func_name = "markAttendance"
                elif matched_route == "'/api/teacher/profile/:email'": func_name = "getProfile"
                elif matched_route == "'/api/teacher/upload-avatar'": func_name = "uploadAvatar"
                elif matched_route == "'/api/teacher/remove-avatar'": func_name = "removeAvatar"
                elif matched_route == "'/api/teacher/upload-material'": func_name = "uploadMaterial"
                elif matched_route == "'/api/teacher/:email/materials'" and method == "post": func_name = "addMaterial"
                elif matched_route == "'/api/teacher/:email/materials'" and method == "get": func_name = "getMaterials"
                elif matched_route == "'/api/teacher/:email/contacts'": func_name = "getContacts"
                elif matched_route == "'/api/teacher/:email/attendance-history'": func_name = "getAttendanceHistory"
                elif matched_route == "'/api/teacher/:email/attendance-monthly-report/:year/:month'": func_name = "getAttendanceMonthlyReport"
                elif matched_route == "'/api/teacher/:email/assignments'": func_name = "getAssignments"
                elif matched_route == "'/api/teacher/:email/class-marks'" and method == "get": func_name = "getClassMarks"
                elif matched_route == "'/api/teacher/:email/class-marks'" and method == "post": func_name = "saveClassMarks"
                else: func_name = method + "Custom" + str(extracted_count)

                seen_routes[route_key] = func_name
                
                # Add to routes_code
                middlewares = ""
                if has_upload_single_photo:
                    middlewares = "upload.single('photo'), "
                if has_upload_single_file:
                    middlewares = "upload.single('file'), "

                route_str = f"router.{method}({clean_route}, {middlewares}teacherController.{func_name});\n"
                routes_code += route_str
            else:
                func_name = seen_routes[route_key]

            # Parse the block
            # If it's a duplicate route (which we know exists), we can just let it overwrite the previous function body in the file
            # or just skip writing the body again.
            
            block_code = f"exports.{func_name} = async (req, res) => {{\n"
            
            body_start_idx = line.find('{')
            open_braces = line.count('{') - line.count('}')
            
            i += 1
            while open_braces > 0 and i < len(lines):
                block_code += lines[i]
                open_braces += lines[i].count('{')
                open_braces -= lines[i].count('}')
                i += 1
            
            # Remove the last `});` line and replace it with `};`
            block_code = block_code.rstrip()
            if block_code.endswith('});'):
                block_code = block_code[:-3] + '};\n\n'
            elif block_code.endswith('}'):
                block_code += '\n\n'

            # Append the block code to controller code (overwriting if duplicate is fine, JS will just use the last export)
            controller_code += block_code

            # Don't add this block to new_server_lines
            continue
            
        new_server_lines.append(line)
        i += 1

    routes_code += "\nmodule.exports = router;\n"

    # Write the files
    with open('c:/Users/lenovo/OneDrive - NSBM/SisuLink/backend/controllers/teacherController.js', 'w', encoding='utf-8') as f:
        f.write(controller_code)

    with open('c:/Users/lenovo/OneDrive - NSBM/SisuLink/backend/routes/teacherRoutes.js', 'w', encoding='utf-8') as f:
        f.write(routes_code)

    # Insert `app.use('/api/teacher', teacherRoutes);` and require
    final_server_lines = []
    student_req_added = False
    teacher_use_added = False
    
    for line in new_server_lines:
        if "const studentRoutes = require('./routes/studentRoutes');" in line and not student_req_added:
            final_server_lines.append(line)
            final_server_lines.append("const teacherRoutes = require('./routes/teacherRoutes');\n")
            student_req_added = True
        elif "app.use('/api/student', studentRoutes);" in line and not teacher_use_added:
            final_server_lines.append(line)
            final_server_lines.append("app.use('/api/teacher', teacherRoutes);\n")
            teacher_use_added = True
        else:
            final_server_lines.append(line)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(final_server_lines)

    print(f"Successfully extracted {extracted_count} teacher routes.")

if __name__ == '__main__':
    extract_routes()
