using System.Web;
using System.Web.Profile;

namespace SDKSite
{
	/// <summary>
	/// Because this is a web application now, and not a web *site*, this class replaces the formerly auto-generated profile class.
	/// </summary>
	/// <remarks></remarks>

	public class ProfileCommon : ProfileBase
	{

		public string FirstName
		{
			get
			{
				return (string)GetPropertyValue("FirstName");
			}
			set
			{
				SetPropertyValue("FirstName", value);
			}
		}

		public string LastName
		{
			get
			{
				return (string)GetPropertyValue("LastName");
			}
			set
			{
				SetPropertyValue("LastName", value);
			}
		}
		public string Organization
		{
			get
			{
				return (string)GetPropertyValue("Organization");
			}
			set
			{
				SetPropertyValue("Organization", value);
			}
		}
		public string Address1
		{
			get
			{
				return (string)GetPropertyValue("Address1");
			}
			set
			{
				SetPropertyValue("Address1", value);
			}
		}
		public string Address2
		{
			get
			{
				return (string)GetPropertyValue("Address2");
			}
			set
			{
				SetPropertyValue("Address2", value);
			}
		}
		public string City
		{
			get
			{
				return (string)GetPropertyValue("City");
			}
			set
			{
				SetPropertyValue("City", value);
			}
		}
		public string State
		{
			get
			{
				return (string)GetPropertyValue("State");
			}
			set
			{
				SetPropertyValue("State", value);
			}
		}
		public string PostalCode
		{
			get
			{
				return (string)GetPropertyValue("PostalCode");
			}
			set
			{
				SetPropertyValue("PostalCode", value);
			}
		}
		public string CountryCode
		{
			get
			{
				return (string)GetPropertyValue("CountryCode");
			}
			set
			{
				SetPropertyValue("CountryCode", value);
			}
		}

		public static ProfileCommon GetProfile()
		{
			return (ProfileCommon)HttpContext.Current.Profile;
		}

		public static ProfileCommon GetProfile(string UserName)
		{
			return (ProfileCommon)Create(UserName);
		}

	}
}
