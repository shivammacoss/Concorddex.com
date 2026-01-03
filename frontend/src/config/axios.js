import axios from 'axios'

// Set base URL for API calls
const API_URL = import.meta.env.VITE_API_URL || 'https://concorddexinvestbackend-production.up.railway.app'

axios.defaults.baseURL = API_URL

export default axios
