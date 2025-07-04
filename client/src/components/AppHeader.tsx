import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Church, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AppHeader() {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "administrator":
        return "Administrator";
      case "mobilizer":
        return "Mobilizer";
      case "missionary":
        return "Missionary";
      default:
        return "User";
    }
  };

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return (first + last).toUpperCase() || "U";
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-ministry-blue rounded-lg flex items-center justify-center">
                <Church className="text-white h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-dark-blue-grey">APME Church Database</h1>
                <p className="text-sm text-gray-500">Romanian Pentecostal Churches</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Role Display */}
            <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
              <UserCog className="h-4 w-4 text-ministry-blue" />
              <Badge variant="secondary" className="text-sm font-medium">
                {getRoleDisplayName(user?.role || "missionary")}
              </Badge>
            </div>
            
            {/* Notification Bell - Placeholder */}
            <Button variant="ghost" size="sm" className="relative p-2">
              <Bell className="h-5 w-5 text-gray-400" />
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 w-5 h-5 text-xs flex items-center justify-center p-0"
              >
                3
              </Badge>
            </Button>
            
            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-dark-blue-grey">
                  {user?.firstName || user?.lastName 
                    ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
                    : "User"
                  }
                </p>
                <p className="text-xs text-gray-500">
                  {user?.region || "Romania"}
                </p>
              </div>
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.profileImageUrl || ""} />
                <AvatarFallback className="text-xs">
                  {getInitials(user?.firstName || null, user?.lastName || null)}
                </AvatarFallback>
              </Avatar>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
