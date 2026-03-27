import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, User, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Import racing car images
import racingCockpit from '@/assets/racing-cockpit.jpg';

const Landing = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login attempt:', { username, password });
    
    // Sample login - check credentials
    if (username === 'testuser' && password === 'password123') {
      console.log('Login successful, navigating to dashboard');
      navigate('/dashboard');
    } else {
      console.log('Login failed');
      alert('Invalid credentials. Use testuser / password123');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Garage Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${racingCockpit})` }}
      />
      
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60"></div>
      
      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        
        {/* Track Side Logo */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Car size={48} className="text-pulse-orange" />
            <h1 className="text-6xl font-bold text-white">
              TRACK SIDE
            </h1>
          </div>
          <p className="text-xl text-white/80">Professional Racing Management</p>
        </div>

        {/* Login Form */}
        <div className="bg-black/80 backdrop-blur-sm p-8 rounded-2xl border border-white/20 w-full max-w-md">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Login to Garage</h2>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="username" className="text-white">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={20} />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-white/50"
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="password" className="text-white">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={20} />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-white/50"
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-pulse-orange hover:bg-pulse-orange/90 text-white font-bold py-3"
            >
              Enter Garage
            </Button>
          </form>
          
          {/* Sample Credentials */}
          <div className="mt-6 p-4 bg-white/10 rounded-lg border border-white/20">
            <p className="text-white/80 text-sm font-semibold mb-2">Sample Login:</p>
            <p className="text-white text-sm">Username: <span className="font-mono">testuser</span></p>
            <p className="text-white text-sm">Password: <span className="font-mono">password123</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;