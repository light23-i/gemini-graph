from flask import Flask, render_template, jsonify, request
import google.generativeai as genai
import os



app = Flask(__name__)


genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
model = genai.GenerativeModel(model_name='gemini-1.5-pro')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate_topic', methods=['POST'])
def generate_topic():
    topic = request.json.get('topic')
    print("generating topic")
    prompt = f"Generate a brief one-line description about the topic: {topic}"
    response = model.generate_content(prompt)
    description = response.text
    print("topic generated")
    return jsonify({
        "name": topic,
        "description": description
    }), 201

@app.route('/generate_subtopics', methods=['POST'])
def generate_subtopics():
    data = request.json
    print("data received")
    print(data)
    if not data or 'name' not in data:
        return jsonify({"error": "Invalid request. 'name' is required."}), 400

    topic = data['name']
    prompt = f"""Generate 3 related subtopics for the topic: {topic}. 
    For each subtopic, provide:
    1. A name (max 2-3 words)
    2. A brief one-line description
    3. A short relation sentence describing how it relates to the main topic, this should be a sentence that is a maximum of 8 words.

    Format the output as follows:
    Subtopic 1: [Name]
    Description: [One-line description]
    Relation: [How it relates to {topic}]

    Subtopic 2: [Name]
    Description: [One-line description]
    Relation: [How it relates to {topic}]

    Subtopic 3: [Name]
    Description: [One-line description]
    Relation: [How it relates to {topic}]
    """
    print("generating subtopics")
    response = model.generate_content(prompt)
    print("response received")
    print(response.text)
    subtopics_text = response.text.split('\n\n')
    print("subtopics generated")
    subtopics = []
    print(subtopics_text)
    for subtopic_text in subtopics_text:
        lines = subtopic_text.split('\n')
        if len(lines) == 3:
            name = lines[0].split(': ', 1)[1].strip()
            description = lines[1].split(': ', 1)[1].strip()
            relation = lines[2].split(': ', 1)[1].strip()
            subtopics.append({
                "name": name,
                "description": description,
                "relation": relation
            })

    return jsonify(subtopics), 201

if __name__ == '__main__':
    app.run(debug=True)