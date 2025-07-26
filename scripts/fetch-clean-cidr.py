#!/usr/bin/env python3
"""
Clean CIDR Auto-Fetcher with BGPView ASN Discovery for ninjaballz
Fixed: Correctly parse BGPView API response
Created: 2025-07-26 09:05:12 UTC
"""

import os
import json
import requests
import random
import ipaddress
import socket
from datetime import datetime
import time

# Configuration
COUNTRY = os.environ.get('COUNTRY', 'US')
MAX_CIDRS_TO_SAVE = 3  # Save 2-3 best CIDRs

class FastBlacklistChecker:
    """Ultra-fast blacklist checker"""
    
    def check_spamhaus_zen(self, ip):
        """Check Spamhaus ZEN"""
        reversed_ip = '.'.join(reversed(ip.split('.')))
        query = f"{reversed_ip}.zen.spamhaus.org"
        
        try:
            socket.setdefaulttimeout(2)
            result = socket.gethostbyname(query)
            return False, 100  # Listed = bad
        except socket.gaierror:
            return True, 0    # Not listed = good
        except:
            return None, 50
    
    def check_stopforumspam(self, ip):
        """Quick StopForumSpam check"""
        try:
            url = f"https://api.stopforumspam.org/api?ip={ip}&json"
            response = requests.get(url, timeout=3)
            
            if response.status_code == 200:
                data = response.json()
                appears = data.get('ip', {}).get('appears', 0)
                if appears == 0:
                    return True, 0
                else:
                    confidence = min(data.get('ip', {}).get('confidence', 50), 100)
                    return False, confidence
        except:
            pass
        
        return None, 25
    
    def get_spam_score(self, ip):
        """Get quick spam score"""
        spamhaus_clean, spamhaus_score = self.check_spamhaus_zen(ip)
        
        if spamhaus_clean is False:
            return 100, True
        
        sfs_clean, sfs_score = self.check_stopforumspam(ip)
        
        scores = []
        if spamhaus_clean is not None:
            scores.append(spamhaus_score)
        if sfs_clean is not None:
            scores.append(sfs_score)
        
        if not scores:
            return 50, False
        
        avg_score = sum(scores) / len(scores)
        is_blacklisted = avg_score > 50
        
        return avg_score, is_blacklisted

def get_random_asns_from_bgpview(country_code):
    """Fetch ASNs from BGPView search API and select randomly"""
    print(f"🔍 Searching ASNs for {country_code} from BGPView...")
    
    url = f"https://api.bgpview.io/search?query_term={country_code}"
    
    try:
        response = requests.get(url, timeout=15, headers={'User-Agent': 'Mozilla/5.0'})
        
        if response.status_code == 200:
            data = response.json()
            
            # Debug: Show what we got
            print(f"📊 API Response status: {data.get('status')}")
            print(f"📊 API Response message: {data.get('status_message')}")
            
            # The ASNs are in data.data.asns (nested)
            asns_data = data.get('data', {})
            asns_list = asns_data.get('asns', [])
            
            if not asns_list:
                print(f"⚠️  No ASNs in response for {country_code}")
                # Try alternative approach - search by country name
                return get_asns_by_country_name(country_code)
            
            print(f"✅ Found {len(asns_list)} ASNs for {country_code}")
            
            # Filter for residential ISPs
            residential_asns = []
            
            for asn_entry in asns_list:
                asn = asn_entry.get('asn')
                name = asn_entry.get('name', '').upper()
                description = asn_entry.get('description', '').upper()
                country = asn_entry.get('country_code', '').upper()
                
                # Make sure it's the right country
                if country != country_code.upper() and country_code != 'US':
                    continue
                
                # Skip cloud/hosting providers
                skip_keywords = [
                    'AMAZON', 'GOOGLE', 'MICROSOFT', 'CLOUD', 'HOSTING',
                    'DIGITALOCEAN', 'LINODE', 'VULTR', 'SERVER', 'DATACENTER',
                    'VPS', 'DEDICATED', 'COLOCATION', 'CDN', 'CONTENT DELIVERY'
                ]
                
                # Look for residential indicators
                residential_keywords = [
                    'TELECOM', 'BROADBAND', 'CABLE', 'DSL', 'FIBER',
                    'INTERNET', 'COMMUNICATIONS', 'TELEKOM', 'MOBILE',
                    'WIRELESS', 'ISP', 'NETWORK', 'RESIDENTIAL'
                ]
                
                # For US, we know these are residential
                us_residential = [
                    'COMCAST', 'VERIZON', 'AT&T', 'SPECTRUM', 'COX',
                    'CENTURYLINK', 'CHARTER', 'FRONTIER', 'WINDSTREAM',
                    'OPTIMUM', 'XFINITY', 'RCN', 'ATLANTIC'
                ]
                
                full_text = f"{name} {description}"
                
                # Skip if cloud/hosting
                if any(skip in full_text for skip in skip_keywords):
                    continue
                
                # Priority 1: Known residential (US)
                if country_code == 'US' and any(res in full_text for res in us_residential):
                    residential_asns.append({
                        'asn': asn,
                        'name': asn_entry.get('name', ''),
                        'description': asn_entry.get('description', ''),
                        'priority': 1
                    })
                # Priority 2: Has residential keywords
                elif any(keyword in full_text for keyword in residential_keywords):
                    residential_asns.append({
                        'asn': asn,
                        'name': asn_entry.get('name', ''),
                        'description': asn_entry.get('description', ''),
                        'priority': 2
                    })
                # Priority 3: Unknown but not cloud
                else:
                    residential_asns.append({
                        'asn': asn,
                        'name': asn_entry.get('name', ''),
                        'description': asn_entry.get('description', ''),
                        'priority': 3
                    })
            
            if not residential_asns:
                print("⚠️  No residential ASNs identified, using top ASNs")
                # Use first few ASNs as fallback
                for asn_entry in asns_list[:10]:
                    residential_asns.append({
                        'asn': asn_entry.get('asn'),
                        'name': asn_entry.get('name', ''),
                        'description': asn_entry.get('description', ''),
                        'priority': 4
                    })
            
            print(f"📊 Identified {len(residential_asns)} potential residential ASNs")
            
            # Sort by priority
            residential_asns.sort(key=lambda x: x['priority'])
            
            # Randomly select 2-3 ASNs
            num_to_select = random.randint(2, min(3, len(residential_asns)))
            
            # Get mix of priorities
            selected_asns = []
            
            # Try to get at least one high priority
            high_priority = [a for a in residential_asns if a['priority'] <= 2]
            if high_priority:
                selected_asns.append(random.choice(high_priority))
                num_to_select -= 1
            
            # Fill the rest randomly
            remaining = [a for a in residential_asns if a not in selected_asns]
            if remaining and num_to_select > 0:
                selected_asns.extend(random.sample(remaining, min(num_to_select, len(remaining))))
            
            # If still not enough, just take what we have
            if not selected_asns and residential_asns:
                selected_asns = residential_asns[:3]
            
            # Extract ASN numbers
            selected_asn_numbers = [a['asn'] for a in selected_asns]
            
            print(f"🎲 Randomly selected {len(selected_asn_numbers)} ASNs:")
            for asn_info in selected_asns:
                print(f"   AS{asn_info['asn']}: {asn_info['name']} - {asn_info['description'][:50]}...")
            
            return selected_asn_numbers
            
    except Exception as e:
        print(f"❌ Error fetching from BGPView: {e}")
        import traceback
        traceback.print_exc()
    
    return []

def get_asns_by_country_name(country_code):
    """Alternative: Get ASNs by searching country name"""
    country_names = {
        'US': 'United States',
        'GB': 'United Kingdom',
        'DE': 'Germany',
        'CA': 'Canada',
        'AU': 'Australia',
        'FR': 'France',
        'NL': 'Netherlands',
        'JP': 'Japan',
        'BR': 'Brazil',
        'IN': 'India'
    }
    
    country_name = country_names.get(country_code, country_code)
    print(f"🔍 Trying alternative search for: {country_name}")
    
    # Alternative approach - use known residential ASNs
    known_residential = {
        'US': [11025, 10796, 11427, 10507, 11426, 7922, 701, 7018],  # Comcast, Verizon, AT&T, etc
        'GB': [2856, 5089, 5607, 13285],  # BT, Virgin, Sky, TalkTalk
        'DE': [3320, 6830, 31334],  # Deutsche Telekom, Vodafone
        'CA': [577, 6327, 5769],  # Bell, Shaw, Rogers
        'AU': [1221, 7545, 4764],  # Telstra, TPG, Optus
    }
    
    if country_code in known_residential:
        asns = known_residential[country_code]
        selected = random.sample(asns, min(3, len(asns)))
        print(f"✅ Using known residential ASNs: {selected}")
        return selected
    
    return []

def fetch_prefixes_for_asn(asn):
    """Fetch prefixes for ASN from BGPView"""
    url = f"https://api.bgpview.io/asn/{asn}/prefixes"
    
    try:
        response = requests.get(url, timeout=10, headers={'User-Agent': 'Mozilla/5.0'})
        if response.status_code == 200:
            data = response.json()
            prefixes = []
            
            # Get IPv4 prefixes
            ipv4_prefixes = data.get('data', {}).get('ipv4_prefixes', [])
            
            for p in ipv4_prefixes:
                prefix = p.get('prefix')
                if prefix:
                    try:
                        network = ipaddress.IPv4Network(prefix)
                        # Prefer residential-sized blocks (/16 to /24)
                        if 16 <= network.prefixlen <= 24:
                            prefixes.append(prefix)
                    except:
                        pass
            
            # Return random selection
            if len(prefixes) > 5:
                return random.sample(prefixes, 5)
            return prefixes
    except Exception as e:
        print(f"  ❌ Error fetching AS{asn}: {e}")
    
    return []

def generate_test_ip(cidr):
    """Generate random IP from CIDR for testing"""
    try:
        network = ipaddress.IPv4Network(cidr, strict=False)
        all_hosts = list(network.hosts())
        
        if len(all_hosts) > 10:
            # Pick from middle of range
            middle = len(all_hosts) // 2
            offset = random.randint(-min(100, middle//2), min(100, middle//2))
            return str(all_hosts[middle + offset])
        elif all_hosts:
            return str(random.choice(all_hosts))
        else:
            return str(network.network_address + 1)
    except:
        return None

def test_cidr_cleanliness(cidr, checker):
    """Test if CIDR is clean"""
    test_ip = generate_test_ip(cidr)
    if not test_ip:
        return None
    
    score, is_blacklisted = checker.get_spam_score(test_ip)
    
    return {
        'cidr': cidr,
        'test_ip': test_ip,
        'score': score,
        'blacklisted': is_blacklisted,
        'clean': score < 20
    }

def main():
    """Main function"""
    print(f"🚀 Clean CIDR Auto-Fetcher for ninjaballz")
    print(f"📅 Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
    print(f"🌍 Country: {COUNTRY}")
    print()
    
    # Get random ASNs from BGPView
    asns = get_random_asns_from_bgpview(COUNTRY)
    
    if not asns:
        print("❌ No ASNs found")
        return
    
    # Collect CIDRs from ASNs
    all_cidrs = []
    asn_map = {}
    
    for asn in asns:
        print(f"\n📡 Fetching prefixes for AS{asn}...")
        prefixes = fetch_prefixes_for_asn(asn)
        
        if prefixes:
            print(f"  ✅ Got {len(prefixes)} prefixes")
            for prefix in prefixes:
                all_cidrs.append(prefix)
                asn_map[prefix] = asn
        else:
            print(f"  ⚠️  No prefixes found")
        
        time.sleep(1)  # Rate limiting
    
    if not all_cidrs:
        print("❌ No CIDRs collected")
        return
    
    # Test CIDRs for cleanliness
    print(f"\n🔍 Testing {len(all_cidrs)} CIDRs...")
    
    checker = FastBlacklistChecker()
    tested_results = []
    
    # Test each CIDR
    for i, cidr in enumerate(all_cidrs):
        print(f"  [{i+1}/{len(all_cidrs)}] Testing {cidr}...", end='', flush=True)
        
        result = test_cidr_cleanliness(cidr, checker)
        if result:
            result['asn'] = asn_map.get(cidr, 'Unknown')
            tested_results.append(result)
            
            if result['clean']:
                print(f" ✅ Clean (score: {result['score']:.1f})")
            else:
                print(f" ❌ Dirty (score: {result['score']:.1f})")
        else:
            print(" ⚠️  Failed")
        
        time.sleep(0.5)  # Rate limiting
    
    # Sort by score (lower is better)
    tested_results.sort(key=lambda x: x['score'])
    
    # Get the cleanest CIDRs
    clean_cidrs = [r for r in tested_results if r['clean']][:MAX_CIDRS_TO_SAVE]
    
    # If not enough clean ones, take best scored
    if len(clean_cidrs) < 2:
        clean_cidrs = tested_results[:MAX_CIDRS_TO_SAVE]
    
    # ninjaballz custom ranges
    custom_ranges = [
        '46.44.64.0/18',
        '121.122.0.0/17',
        '62.178.128.0/17',
        '150.91.224.0/20'
    ]
    
    # Write results
    with open('cidr-ranges.txt', 'w') as f:
        f.write(f"# Clean Residential CIDRs\n")
        f.write(f"# Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC\n")
        f.write(f"# User: ninjaballz\n")
        f.write(f"# Country: {COUNTRY}\n")
        f.write(f"# Auto-updated every 10 minutes via BGPView\n\n")
        
        # Custom ranges
        f.write("# ninjaballz custom ranges\n")
        for cidr in custom_ranges:
            f.write(f"{cidr}\n")
        
        # Clean residential ranges
        f.write(f"\n# Clean {COUNTRY} Residential Ranges (Random ASNs)\n")
        for result in clean_cidrs:
            f.write(f"# AS{result['asn']} - Score: {result['score']:.1f} - Test IP: {result['test_ip']}\n")
            f.write(f"{result['cidr']}\n")
    
    # Save report
    report = {
        'timestamp': datetime.utcnow().isoformat(),
        'country': COUNTRY,
        'asns_used': asns,
        'total_tested': len(tested_results),
        'clean_found': len([r for r in tested_results if r['clean']]),
        'saved_cidrs': [r['cidr'] for r in clean_cidrs],
        'best_scores': clean_cidrs
    }
    
    with open('clean-report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    # Summary
    print(f"\n✅ Complete!")
    print(f"📊 Summary:")
    print(f"   Country: {COUNTRY}")
    print(f"   ASNs used: {asns}")
    print(f"   CIDRs tested: {len(tested_results)}")
    print(f"   Clean CIDRs saved: {len(clean_cidrs)}")
    
    if clean_cidrs:
        print(f"\n🏆 Best CIDRs:")
        for r in clean_cidrs:
            print(f"   {r['cidr']} (AS{r['asn']}, score: {r['score']:.1f})")

if __name__ == "__main__":
    random.seed(int(time.time()))
    main()
