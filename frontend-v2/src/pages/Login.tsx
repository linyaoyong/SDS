import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/auth';
import { saveTokens } from '../utils/api';
import { useAuthStore } from '../stores/auth';
import { toast } from 'sonner';
import { User, Lock, Eye, EyeOff, Recycle } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credential || !password) {
      toast.error('请填写账号和密码');
      return;
    }
    setLoading(true);
    try {
      // 1. 登录获取 token
      const loginRes = await authAPI.login(credential, password);

      // 2. ⚠️ 先把 token 存入 localStorage，否则 getCurrentUser 请求没有 Authorization header
      saveTokens(loginRes.accessToken, loginRes.refreshToken);

      // 3. 用 token 获取用户完整信息
      const user = await authAPI.getCurrentUser();

      // 4. 存入 store
      login(loginRes.accessToken, loginRes.refreshToken, user);
      toast.success('登录成功');
      navigate('/');
    } catch (error: any) {
      console.error('登录失败:', error);
      toast.error(error?.message || '登录失败，请检查账号和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute right-1/4 bottom-1/4 h-80 w-80 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20 relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center" style={{background:'linear-gradient(135deg, #2563eb, #7c3aed)'}}>
              <Recycle className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">校园二手</h1>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">欢迎回来</h2>
          <p className="text-gray-600 text-sm">支持用户名/手机号/邮箱/学号登录</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">账号</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 text-gray-900"
                placeholder="用户名/手机号/邮箱/学号"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 text-gray-900"
                placeholder="请输入密码"
                required
              />
              <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl text-base font-semibold text-white shadow-lg transition-all duration-300 hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{background:'linear-gradient(135deg, #2563eb, #7c3aed)'}}
          >
            {loading ? '登录中...' : '登录'}
          </button>

          <div className="text-center text-sm">
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">还没有账号？立即注册</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
