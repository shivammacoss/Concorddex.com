import axios from 'axios'

// Set base URL for API calls
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

axios.defaults.baseURL = API_URL

export default axios
