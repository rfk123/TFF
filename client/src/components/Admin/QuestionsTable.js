import React, { useState, useEffect } from 'react';

const QuestionsTable = () => {
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await fetch('/api/admin/questions');
      const data = await response.json();
      const formattedData = data.map((question) => ({
        ...question,
        created_at: new Date(question.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
      }));
      setQuestions(formattedData);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const resolveQuestion = async (id) => {
    try {
      const response = await fetch(`/api/admin/questions/${id}/resolve`, {
        method: 'PUT',
      });
      if (response.ok) {
        alert('Question resolved successfully');
        fetchQuestions();
      } else {
        alert('Failed to resolve question');
      }
    } catch (error) {
      console.error('Error resolving question:', error);
    }
  };

  return (
    <section>
      <h2>Questions</h2>
      <p>Total Questions: {questions.length}</p>
      <table className="questions-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Subject</th>
            <th>Message</th>
            <th>Date Sent</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((question, index) => (
            <tr key={index}>
              <td>{question.name}</td>
              <td>{question.email}</td>
              <td>{question.subject}</td>
              <td>{question.message}</td>
              <td>{question.created_at}</td>
              <td>
                <button onClick={() => resolveQuestion(question.id)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

export default QuestionsTable;