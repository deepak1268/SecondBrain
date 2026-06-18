import { Button } from "../components/button";
import { SideBar } from "../components/sidebar";
import { PlusIcon } from "../icons/PlusIcon";
import { ShareIcon } from "../icons/ShareIcon";
import { Card } from "../components/card";
import { CreateContentModal } from "../components/createContentModal";
import { useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { ShareBrainModal } from "../components/ShareBrainModal";
import SearchBar from "../components/searchBar";

export interface ContentItem {
  title: string;
  type: string;
  link: string;
  tags: string[];
}

export const Dashboard = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [link, setLink] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function fetchContent() {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/api/v1/content`, {
          headers: {
            token,
          },
        });
        setContent(res.data.content);
      } catch (err) {
        console.error(err);
        alert("Some error occured while loading dashboard.");
      } finally {
        setLoading(false);
      }
    }
    fetchContent();
  }, []);

  async function shareLink() {
    try {
      const token = localStorage.getItem("token");
      setShareOpen(true);
      const res = await axios.post(
        `${BACKEND_URL}/api/v1/brain/share`,
        {
          share: true,
        },
        {
          headers: {
            token,
          },
        },
      );
      setLink(res.data.hash);
    } catch (err) {
      console.error(err);
      alert("Some error occured.");
    }
  }

  async function search(){
    try{
      console.log("search function called.")
      const token = localStorage.getItem("token");
      console.log(token);
      const res = await axios.post(`${BACKEND_URL}/api/v1/search`,{query},{
        headers: {
          token
        }
      });
      console.log(res.data)
      setContent(res.data.contents);
    } catch(err){
      console.error(err);
      alert("Error occured while searching");
    }
  }

  return (
    <div className="bg-gray-100 flex min-h-screen">
      {modalOpen && <CreateContentModal onClose={() => setModalOpen(false)} />}
      {shareOpen && (
        <ShareBrainModal onClose={() => setShareOpen(false)} link={link} />
      )}

      <SideBar />

      <div className="flex-grow px-10 py-8 ml-70">
        {/* top header  */}
        <div className="flex justify-between items-center p-5">
          <div className="text-3xl font-semibold">All Notes</div>

          <div className="flex gap-2">
            <Button
              variant="primary"
              text="Share Brain"
              onClick={shareLink}
              startIcon={<ShareIcon />}
            />
            <Button
              variant="secondary"
              text="Add Content"
              onClick={() => setModalOpen(true)}
              startIcon={<PlusIcon />}
            />
          </div>
        </div>

        <div className="bg-gray-200 h-1"></div>

        <SearchBar query={query} setQuery={setQuery} searchHandler={search}/>

        {/* content */}
        {loading ? (
          "Loading..."
        ) : (
          <div className="grid grid-cols-3 gap-x-4 gap-y-8 mt-10">
            {content.length <= 0
              ? "You dont't have any content."
              : content.map((con, idx) => (
                  <Card
                    key={idx}
                    title={con.title}
                    type={con.type}
                    link={con.link}
                    tags={con.tags}
                  />
                ))}
          </div>
        )}
      </div>
    </div>
  );
};
