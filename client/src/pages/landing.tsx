import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Church, MapPin, Users, Globe } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-ministry-blue rounded-lg flex items-center justify-center">
                <Church className="text-white h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-dark-blue-grey">APME Church Database</h1>
                <p className="text-sm text-gray-500">Romanian Pentecostal Churches</p>
              </div>
            </div>
            <Button onClick={handleLogin} className="bg-ministry-blue hover:bg-blue-700">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-dark-blue-grey mb-4">
              Empowering Romanian Ministry
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              A comprehensive database and mapping system for APME's Pentecostal church network across Romania
            </p>
            <Button 
              onClick={handleLogin} 
              size="lg"
              className="bg-ministry-blue hover:bg-blue-700 text-lg px-8 py-3"
            >
              Get Started
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <Card>
              <CardHeader>
                <MapPin className="h-8 w-8 text-ministry-blue mx-auto mb-2" />
                <CardTitle className="text-lg">Interactive Mapping</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Visualize church locations across Romania with GPS coordinates and engagement levels
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-8 w-8 text-growth-green mx-auto mb-2" />
                <CardTitle className="text-lg">Role-Based Access</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Secure access controls for administrators, mobilizers, and missionaries
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Globe className="h-8 w-8 text-warm-orange mx-auto mb-2" />
                <CardTitle className="text-lg">Mission Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Track engagement trends and plan missionary visits effectively
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Stats Section */}
          <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
            <h3 className="text-2xl font-semibold text-dark-blue-grey mb-6">
              Supporting Romanian Ministry
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-ministry-blue mb-2">247+</div>
                <div className="text-gray-600">Churches Mapped</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-growth-green mb-2">42</div>
                <div className="text-gray-600">Counties Covered</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-warm-orange mb-2">189</div>
                <div className="text-gray-600">Active Partnerships</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-earth-brown mb-2">25+</div>
                <div className="text-gray-600">Years of Ministry</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500">
          <p>&copy; 2024 APME Romanian Ministry. Advancing Pentecostal missions across Romania.</p>
        </div>
      </footer>
    </div>
  );
}
