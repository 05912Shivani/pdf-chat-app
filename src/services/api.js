// src/services/api.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

export const processPDF = async (file) => {
  const formData = new FormData();
  formData.append('file', file);  // This must match the server's expected field name

  try {
    const response = await axios.post(`${API_BASE_URL}/process-pdf`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw new Error(error.response?.data?.message || 'Failed to process PDF');
  }
};
// In src/services/api.js
export const queryLLM = async ({ message, chatHistory = [], context = null }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/chat`, {
        message,
        chatHistory,
        context,
      });
      return response.data;
    } catch (error) {
      console.error('Error querying LLM:', error);
      throw new Error(error.response?.data?.message || 'Failed to get response from AI');
    }
  };